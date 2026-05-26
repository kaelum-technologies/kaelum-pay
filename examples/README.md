# Examples

Three runnable examples, one per integration pattern.

| Folder | Pattern | What it shows |
|---|---|---|
| `merchant-hosted-checkout` | Hosted Paylink redirect | Create a pay link, redirect the customer to it. |
| `creator-embedded-widget` | Embedded checkout widget | Pay inside a modal without leaving the page. |
| `webhook-receiver` | Webhook verification | Verify and handle signed webhook events. |

## Running an example

Each example is self-contained. From inside an example folder:

```bash
npm install
cp .env.example .env   # then fill in your keys
npm start
```

You will need:

- A developer secret key (`sk_live_...`) from
  [kaelum.app/developer/portal](https://kaelum.app/developer/portal).
- For the webhook example, a webhook signing secret (`whsec_...`).

The examples depend on `@kaelum/pay`. When running them from inside this
repository before the package is published, install the local build first:

```bash
# from the repository root
npm install && npm run build && npm pack
# then in the example folder, install the generated tarball
npm install ../../kaelum-pay-0.1.0.tgz
```

Once `@kaelum/pay` is published to npm, a plain `npm install` is enough.
