# API reference

Every method on the `KaelumPay` client. All methods are async and return a
Promise. All errors extend `KaelumError`.

## Constructor

```ts
new KaelumPay(options: KaelumPayOptions)
```

| Option | Type | Default | Notes |
|---|---|---|---|
| `secretKey` | `string` | required | Your `sk_live_...` key. |
| `baseUrl` | `string` | production MCP endpoint | Override the API endpoint. |
| `timeoutMs` | `number` | `30000` | Per-request timeout. |
| `maxRetries` | `number` | `2` | Retries for transient network failures. |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch implementation. |

---

## kaelum.paylinks

### create(params)

Create a fixed-amount hosted pay link.

```ts
const link = await kaelum.paylinks.create({
  amountGbp: 49.99,
  description: "Order #1024",
  redirectUrl: "https://shop.example.com/thank-you",  // optional
  webhookUrl: "https://shop.example.com/webhooks/kaelum", // optional
});
```

Returns a `Paylink`: `{ id, url, embedToken?, embedHtml?, amountGbp, description, status?, redirectUrl?, webhookUrl?, usageCount?, createdAt? }`.

### list(params?)

List your pay links, most recent first.

```ts
const links = await kaelum.paylinks.list({ limit: 25 });
```

Returns `Paylink[]`.

---

## kaelum.auth

### authenticate(params)

Exchange an account number and personal API key for a session token valid
for roughly one hour.

```ts
const session = await kaelum.auth.authenticate({
  accountNumber: "KA-100245",
  apiKey: process.env.KAELUM_USER_KEY!,
});
```

Returns an `AuthSession`: `{ sessionToken, expiresAt? }`.

---

## kaelum.payments

### initiate(params)

Initiate a payment. Returns a `PENDING` transaction. Present the details to
the customer before confirming.

```ts
const pending = await kaelum.payments.initiate({
  amountKlm: 250,
  merchantId: "merchant_abc",
  sessionToken: session.sessionToken,
  reference: "Order #1024", // optional
});
```

### confirm(sessionToken, transactionId)

Confirm and execute a pending payment. This transfers KAE and cannot be
reversed.

```ts
const tx = await kaelum.payments.confirm(session.sessionToken, pending.transactionId);
```

### cancel(sessionToken, transactionId)

Cancel a payment that is still `PENDING`.

```ts
await kaelum.payments.cancel(session.sessionToken, pending.transactionId);
```

### status(transactionId, auth)

Check a transaction. Accepts a session token or a read-only API key.

```ts
const tx = await kaelum.payments.status("txn_abc123", {
  sessionToken: session.sessionToken,
});
```

All three return a `PaymentTransaction`: `{ transactionId, status, amountKlm, amountGbp?, merchantId, reference?, createdAt? }`. `status` is one of `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `EXPIRED`, `FAILED`.

---

## kaelum.klm

### price()

Retrieve the current KAE price.

```ts
const { priceGbp } = await kaelum.klm.price();
```

Returns a `KlmPrice`: `{ priceGbp, currency?, asOf? }`.

---

## kaelum.balances

### retrieve(userId)

Retrieve a KAELUM account balance summary.

```ts
const balance = await kaelum.balances.retrieve("KA-100245");
```

Returns an `AccountBalance`: `{ userId, balanceKlm, balanceGbp?, tier?, status? }`.

---

## kaelum.merchants

### list(query?)

List merchants and creators that can receive KAE payments.

```ts
const merchants = await kaelum.merchants.list("coffee");
```

Returns `Merchant[]`: `{ id, name, tier? }`.

---

## kaelum.developerKeys

### list()

List the developer API keys on your account.

```ts
const keys = await kaelum.developerKeys.list();
```

Returns `DeveloperKey[]`: `{ id, publishableKey?, status?, createdAt? }`.

---

## kaelum.kate

### status()

Retrieve K.A.T.E. engine health.

```ts
const { status, activeAgents } = await kaelum.kate.status();
```

Returns a `KateStatus`: `{ status, activeAgents?, lastHeartbeat? }`.

---

## kaelum.webhooks

See the [webhooks guide](./webhooks.md) for `constructEvent` and `verify`.

---

## Errors

| Class | Raised when |
|---|---|
| `KaelumError` | Base class for every SDK error. |
| `KaelumApiError` | The API returned an error response. Has `status?`, `tool?`, `raw?`. |
| `KaelumAuthenticationError` | A key, token, or credential was rejected. |
| `KaelumConnectionError` | The API could not be reached, or a timeout. |
| `KaelumSignatureVerificationError` | A webhook signature failed verification. |
| `KaelumInvalidRequestError` | Invalid arguments, caught before any network call. |
