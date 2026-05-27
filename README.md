<p align="center">
  <img src="./assets/kaelum-logo.png" alt="KAELUM" width="120" />
</p>

[![npm](https://img.shields.io/npm/v/@kaelum/pay.svg)]
(https://www.npmjs.com/package/@kaelum/pay)

<h1 align="center">KAELUM Pay SDK</h1>

<p align="center">
  Accept KLM, the Ai-governed closed-loop digital commerce currency, as a payment option on any website or app.
</p>

<p align="center">
  <code>@kaelum/pay</code> &nbsp;&middot;&nbsp; TypeScript &nbsp;&middot;&nbsp; Node.js 18+ &nbsp;&middot;&nbsp; MIT licensed
</p>

---

## What this is

`@kaelum/pay` is the official SDK for KAELUM Pay. It lets a business, merchant, or creator take payment in KLM with a few lines of code. KLM is a closed-loop digital commerce currency governed by the K.A.T.E. (Kaelum Audivo Triovus Engine). It is not a cryptocurrency and there is no blockchain, no exchange, and no gas fee involved. Customers receive the standard 6%+ spending discount on goods and services when they pay with KLM.

The SDK is a typed wrapper around the live KAELUM MCP server. It ships with zero runtime dependencies, dual ESM and CommonJS builds, and full TypeScript types.

## Four ways to integrate

| Method | Use it when | Entry point |
|---|---|---|
| **Hosted Paylink redirect** | You want the fastest integration. Create a pay link, send the customer to it. | `kaelum.paylinks.create()` |
| **Embedded checkout widget** | You want the customer to pay without leaving your page. | `@kaelum/pay/checkout` |
| **Server-to-server payment API** | You are building an agent, a point of sale, or a custom flow that holds a customer session. | `kaelum.payments.*` |
| **Webhook verification** | You need to be told, server-side, when a payment completes. | `kaelum.webhooks.constructEvent()` |

## Install

```bash
npm install @kaelum/pay
```

You will need a developer secret key (`sk_live_...`). Generate one in the [KAELUM Developer Portal](https://kaelum.app/developer/portal).

## Quickstart: hosted Paylink

Create a pay link on your server, then redirect the customer to it.

```ts
import { KaelumPay } from "@kaelum/pay";

const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY! });

const link = await kaelum.paylinks.create({
  amountGbp: 49.99,
  description: "Order #1024",
  redirectUrl: "https://shop.example.com/thank-you",
  webhookUrl: "https://shop.example.com/webhooks/kaelum",
});

// Send the customer to the hosted checkout.
response.redirect(link.url);
```

That is the entire integration for a basic checkout. The customer pays on a KAELUM-hosted page, is returned to your `redirectUrl`, and your server is notified at `webhookUrl`.

## Embedded checkout widget

Keep the customer on your own page. The widget loads the hosted checkout in a modal overlay.

```ts
import { openCheckout } from "@kaelum/pay/checkout";

// paylinkUrl comes from kaelum.paylinks.create() on your server.
openCheckout({
  url: paylinkUrl,
  onSuccess: (payment) => { window.location.href = "/thank-you"; },
  onCancel: () => console.log("Customer cancelled"),
  onError: (message) => console.error(message),
});
```

Or wire it up declaratively with a data attribute:

```html
<button data-kaelum-checkout="https://kaelum.app/pay/abc123">
  Pay with KAELUM
</button>
<script type="module">
  import { autowireCheckout } from "@kaelum/pay/checkout";
  autowireCheckout({ onSuccess: () => location.assign("/thank-you") });
</script>
```

## Server-to-server payments

The direct payment API moves KLM from a customer account to a merchant or creator account. The flow is two-step on purpose: a payment is initiated, the customer reviews it, then it is confirmed. A confirmed payment cannot be reversed.

```ts
const session = await kaelum.auth.authenticate({
  accountNumber: "KA-100245",
  apiKey: process.env.KAELUM_USER_KEY!,
});

const pending = await kaelum.payments.initiate({
  amountKlm: 250,
  merchantId: "merchant_abc",
  sessionToken: session.sessionToken,
  reference: "Order #1024",
});

// Show `pending` to the customer, then on explicit confirmation:
const completed = await kaelum.payments.confirm(
  session.sessionToken,
  pending.transactionId,
);
```

## Webhooks

KAELUM Pay signs every webhook with HMAC-SHA256. Always verify the signature before acting on the payload. Pass the **raw** request body, not a re-serialised object.

```ts
import express from "express";
import { KaelumPay } from "@kaelum/pay";

const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY! });
const app = express();

app.post("/webhooks/kaelum", express.raw({ type: "*/*" }), (req, res) => {
  try {
    const event = kaelum.webhooks.constructEvent(
      req.body,
      req.headers["kaelum-signature"] as string,
      process.env.KAELUM_WEBHOOK_SECRET!,
    );
    if (event.type === "payment.succeeded") {
      fulfilOrder(event.data);
    }
    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
});
```

## API surface

| Resource | Methods |
|---|---|
| `kaelum.paylinks` | `create`, `list` |
| `kaelum.auth` | `authenticate` |
| `kaelum.payments` | `initiate`, `confirm`, `cancel`, `status` |
| `kaelum.klm` | `price` |
| `kaelum.balances` | `retrieve` |
| `kaelum.merchants` | `list` |
| `kaelum.developerKeys` | `list` |
| `kaelum.kate` | `status` |
| `kaelum.webhooks` | `constructEvent`, `verify` |

Full reference: [`docs/api-reference.md`](./docs/api-reference.md).

## Error handling

Every error raised by the SDK extends `KaelumError`, so one catch handles them all.

```ts
import { KaelumError, KaelumAuthenticationError } from "@kaelum/pay";

try {
  await kaelum.paylinks.create({ amountGbp: 10, description: "Test" });
} catch (err) {
  if (err instanceof KaelumAuthenticationError) {
    // Bad or missing secret key.
  } else if (err instanceof KaelumError) {
    console.error(err.code, err.message);
  }
}
```

## Documentation

- [Quickstart](./docs/quickstart.md)
- [API reference](./docs/api-reference.md)
- [Webhooks guide](./docs/webhooks.md)
- [Embedded checkout guide](./docs/checkout.md)
- [Integration notes](./INTEGRATION_NOTES.md): what is confirmed against the live API and what to verify on first use.

## Examples

Runnable examples are in [`examples/`](./examples):

- `merchant-hosted-checkout` — an Express server that creates a pay link and redirects.
- `creator-embedded-widget` — a static page using the embedded checkout widget.
- `webhook-receiver` — an Express endpoint that verifies and handles webhooks.

## Security

The developer secret key (`sk_live_...`) and the webhook signing secret (`whsec_...`) are server-side credentials. Never expose them in browser code, a public repository, or a client bundle. Report security issues per [`SECURITY.md`](./SECURITY.md).

## Requirements

- Node.js 18 or later (for the server SDK).
- A modern browser (for the embedded checkout widget).

## Support

- Developer Portal: [kaelum.app/developer/portal](https://kaelum.app/developer/portal)
- Issues: [GitHub Issues](https://github.com/kaelum-technologies/kaelum-pay/issues)
- Email: info@kaelumtechnologies.com

## Licence

MIT. Copyright Kaelum Technologies Ltd. See [`LICENSE`](./LICENSE).
