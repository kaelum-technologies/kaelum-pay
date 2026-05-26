# Webhooks

A webhook is how KAELUM Pay tells your server, reliably, that something
happened: a payment succeeded, a payment failed, a pay link was paid. Never
rely on a browser redirect alone to fulfil an order. Rely on the webhook.

## How it works

1. You register a webhook URL, either per pay link (`webhookUrl` on
   `paylinks.create`) or in the Developer Portal.
2. When an event occurs, KAELUM Pay sends an HTTP POST to that URL.
3. The request body is the event, as JSON. The request carries a
   `Kaelum-Signature` header.
4. KAELUM Pay expects a `2xx` response. If it does not get one, it retries
   up to three times with backoff.

## Verifying a webhook

KAELUM Pay signs each delivery with HMAC-SHA256 using your webhook signing
secret (`whsec_...`). Verification proves the request genuinely came from
KAELUM and was not tampered with.

The single rule that matters: **pass the raw request body**. If you parse
the body to JSON and then hand the parsed object to `constructEvent`, the
bytes have changed and verification will fail. Capture the body as a raw
string or Buffer.

### Express

```ts
import express from "express";
import { KaelumPay, KaelumSignatureVerificationError } from "@kaelum/pay";

const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY! });
const app = express();

// express.raw keeps the body as a Buffer for this route.
app.post("/webhooks/kaelum", express.raw({ type: "*/*" }), (req, res) => {
  let event;
  try {
    event = kaelum.webhooks.constructEvent(
      req.body,
      req.headers["kaelum-signature"] as string,
      process.env.KAELUM_WEBHOOK_SECRET!,
    );
  } catch (err) {
    if (err instanceof KaelumSignatureVerificationError) {
      return res.sendStatus(400);
    }
    throw err;
  }

  switch (event.type) {
    case "payment.succeeded":
      fulfilOrder(event.data);
      break;
    case "payment.failed":
    case "payment.cancelled":
      releaseOrder(event.data);
      break;
  }

  res.sendStatus(200);
});
```

### Next.js route handler

```ts
import { KaelumPay } from "@kaelum/pay";

const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY! });

export async function POST(req: Request) {
  const rawBody = await req.text(); // raw string, not req.json()
  const signature = req.headers.get("kaelum-signature") ?? undefined;

  try {
    const event = kaelum.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.KAELUM_WEBHOOK_SECRET!,
    );
    // handle event.type
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
```

## Event types

| Type | Meaning |
|---|---|
| `payment.succeeded` | A payment completed. Fulfil the order. |
| `payment.failed` | A payment failed. |
| `payment.cancelled` | The customer cancelled. |
| `payment.expired` | A pending payment expired unpaid. |
| `paylink.paid` | A pay link received a payment. |

A verified event is `{ id, type, createdAt?, data }`. The `data` object
carries the payment or pay link the event is about.

## Replay protection

If the signature header includes a timestamp, `constructEvent` rejects
deliveries older than five minutes. Adjust or disable this with the
`toleranceSeconds` option:

```ts
kaelum.webhooks.constructEvent(rawBody, signature, secret, {
  toleranceSeconds: 600, // 10 minutes; 0 disables the check
});
```

## Good practice

- Return `2xx` quickly. Do slow work (sending email, calling other APIs)
  after you have responded, or on a queue.
- Make your handler idempotent. A retry can deliver the same event twice.
  Key your fulfilment on `event.id` or the transaction ID.
- Verify every webhook. An unverified request is an untrusted request.

See also [`INTEGRATION_NOTES.md`](../INTEGRATION_NOTES.md) for the webhook
fields and header to confirm against your first live delivery.
