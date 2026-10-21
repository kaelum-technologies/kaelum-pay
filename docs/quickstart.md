# Quickstart

This guide takes you from an empty project to a working KAE checkout.

## 1. Get your keys

Sign in at the [KAELUM Developer Portal](https://kaelum.app/developer/portal)
and create a key pair:

- `sk_live_...` — your secret key. Server-side only.
- `pk_live_...` — your publishable key. Safe for browser code.

Keep the secret key in an environment variable, never in source control.

```bash
# .env
KAELUM_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

## 2. Install the SDK

```bash
npm install @kaelum/pay
```

## 3. Create your first pay link

```ts
import { KaelumPay } from "@kaelum/pay";

const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY! });

const link = await kaelum.paylinks.create({
  amountGbp: 19.99,
  description: "Starter plan, one month",
});

console.log(link.url); // https://kaelum.app/pay/...
```

## 4. Get the customer to the checkout

You have three options.

**Redirect.** Send the customer straight to `link.url`.

```ts
res.redirect(link.url);
```

**Embed.** Keep the customer on your page with the checkout widget.

```ts
import { openCheckout } from "@kaelum/pay/checkout";
openCheckout({ url: link.url, onSuccess: () => location.assign("/done") });
```

**Link.** Render `link.url` as an ordinary anchor or button.

```html
<a href="https://kaelum.app/pay/...">Pay with KAELUM</a>
```

## 5. Confirm the payment server-side

Do not treat a browser redirect as proof of payment. Confirm it on your
server with a webhook.

```ts
app.post("/webhooks/kaelum", express.raw({ type: "*/*" }), (req, res) => {
  const event = kaelum.webhooks.constructEvent(
    req.body,
    req.headers["kaelum-signature"] as string,
    process.env.KAELUM_WEBHOOK_SECRET!,
  );
  if (event.type === "payment.succeeded") fulfilOrder(event.data);
  res.sendStatus(200);
});
```

See the [webhooks guide](./webhooks.md) for the full picture.

## 6. Verify the integration

Run the [first-run checklist](../INTEGRATION_NOTES.md#first-run-checklist).
When all five steps pass, you are ready for production.

## Next steps

- [API reference](./api-reference.md)
- [Embedded checkout guide](./checkout.md)
- Working code in [`examples/`](../examples)
