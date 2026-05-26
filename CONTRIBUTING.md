# Contributing

Thanks for your interest in improving the KAELUM Pay SDK.

## Getting set up

```bash
git clone https://github.com/kaelum-technologies/kaelum-pay.git
cd kaelum-pay
npm install
```

| Command | What it does |
|---|---|
| `npm run build` | Build ESM and CJS bundles plus type declarations. |
| `npm run dev` | Build in watch mode. |
| `npm run typecheck` | Type-check without emitting files. |
| `npm run clean` | Remove the `dist` folder. |

Before opening a pull request, make sure both of these pass:

```bash
npm run typecheck
npm run build
```

## How the SDK is structured

- `src/client.ts` — the `KaelumPay` client that ties resources together.
- `src/transport.ts` — the only file that speaks the MCP wire protocol.
- `src/resources/` — one file per group of related API methods.
- `src/webhooks.ts` — webhook signature verification (Node only).
- `src/checkout.ts` — the browser embedded checkout widget (browser only).
- `src/errors.ts`, `src/types.ts` — the error hierarchy and shared types.

The transport is the boundary. Resource files never call `fetch`
themselves; they call `transport.call(tool, args)`. Keep it that way.

## Coding standards

- TypeScript in `strict` mode. No `any`. The build must type-check cleanly.
- The server SDK may use `node:` built-ins. `src/checkout.ts` must not, it
  is browser-only.
- Keep runtime dependencies at zero. The SDK uses native `fetch` and
  `node:crypto` only.
- British English in comments and documentation.
- Match the existing style: clear names, short functions, doc comments on
  every public method.

## Pull requests

1. Open an issue first for anything beyond a small fix, so we can agree on
   the approach.
2. Keep each pull request focused on one change.
3. Update `CHANGELOG.md` under an `Unreleased` heading.
4. Update the relevant file in `docs/` if you change public behaviour.

## Reporting bugs

Use the bug report issue template. Include the SDK version, your Node.js
version, a minimal reproduction, and what you expected to happen.

## Security

Do not open a public issue for a security vulnerability. Follow the process
in [`SECURITY.md`](./SECURITY.md).
