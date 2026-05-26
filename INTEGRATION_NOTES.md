# Integration notes

This SDK mirrors the live KAELUM MCP server at
`https://kaelum-mcp.kaelumtechnologies.workers.dev/mcp`. This document is an
honest account of what is **confirmed** against the live server and what is
**expected** and should be verified on first use. Read it before going to
production.

## Confirmed against the live API

These are taken directly from the live MCP server and a live tool call.

- **Transport.** The server speaks JSON-RPC 2.0. The SDK calls each tool
  with `method: "tools/call"`. No connector-level authentication is
  required; per-call authentication is passed as tool arguments.
- **Request schemas.** Every request parameter the SDK sends matches the
  live tool schema: `kaelum_authenticate`, `kaelum_create_paylink`,
  `kaelum_list_paylinks`, `kaelum_payment_initiate`, `kaelum_payment_confirm`,
  `kaelum_payment_cancel`, `kaelum_payment_status`, `kaelum_get_user_balance`,
  `kaelum_get_developer_keys`, `kaelum_get_kate_status`.
- **Response envelope.** Tool results are wrapped in a standard envelope:
  `{ success, data, meta, timestamp, api_version, platform }`. The SDK
  unwraps this to `data` automatically and converts `success: false` into a
  typed error.
- **K.A.T.E. status fields.** `kaelum.kate.status()` is mapped to the
  confirmed live fields `overall_status`, `active_agent_count`, and
  `last_assessment`.

## Expected, and worth verifying once

The SDK is built to tolerate variation here, using multi-key field lookups,
but you should confirm these against a live call before launch.

1. **Response field names inside `data`.** For pay links, payments,
   balances, the KLM price, merchants, and developer keys, the SDK reads
   several candidate field names (for example both `amountGbp` and
   `amount_gbp`). Make one real call for each resource and confirm the
   returned objects are populated. If a field comes back empty, add the
   real key to the relevant normaliser in `src/resources/`.

2. **`kaelum_get_klm_price` and `kaelum_get_merchants`.** These tools are
   listed in the KAELUM connector directory. The SDK calls them by those
   names. The merchant directory filter is sent as a `query` argument;
   confirm the live parameter name.

3. **Webhook signature header and encoding.** The SDK verifies HMAC-SHA256
   and reads the signature from the `Kaelum-Signature` header by default.
   It accepts three encodings: a bare hex digest, a `sha256=` prefixed
   digest, and a timestamped `t=...,v1=...` form. Confirm the header name
   and encoding the live webhook delivery uses, and adjust the header you
   read in your route handler if needed.

4. **Webhook payload shape.** `constructEvent` reads `id`, `type`, and
   `data` (it also accepts `event_id`, `event`, and `payload`). Inspect one
   real delivery and confirm the event `type` strings match the
   `WebhookEventType` union in `src/types.ts`.

5. **Embedded checkout messages.** The widget in `@kaelum/pay/checkout`
   listens for `window.postMessage` events from the hosted checkout page
   (`kaelum.app/pay/:embedToken`). It expects messages shaped like
   `{ source: "kaelum-pay", type: "payment.succeeded", payment: {...} }`.
   The hosted page must emit these for `onSuccess`, `onCancel`, and
   `onError` to fire. If it does not yet, the widget still displays the
   checkout correctly; only the callbacks depend on this contract.

## First-run checklist

Run these in order against the live server:

1. `await kaelum.kate.status()` — confirms the transport and envelope
   unwrapping work end to end. Should return `OPERATIONAL`.
2. `await kaelum.klm.price()` — confirms a read works and returns a number.
3. `await kaelum.paylinks.create({ amountGbp: 1, description: "SDK test" })`
   — confirms your secret key works and returns a usable `url`.
4. Open that `url` in a browser to confirm the hosted checkout renders.
5. Register a webhook endpoint, trigger a test delivery, and confirm
   `kaelum.webhooks.constructEvent` verifies it.

Once those five pass, the integration is sound. Anything that fails points
to a specific item in the list above.
