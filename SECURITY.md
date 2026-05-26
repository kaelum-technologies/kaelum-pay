# Security policy

## Reporting a vulnerability

If you find a security vulnerability in the KAELUM Pay SDK, report it
privately. Do not open a public GitHub issue.

Email **info@kaelumtechnologies.com** with:

- a description of the vulnerability,
- steps to reproduce it,
- the SDK version and environment,
- the potential impact, as you see it.

You will receive an acknowledgement within three business days. We will
keep you updated as we investigate and will credit you in the release notes
once a fix ships, unless you ask us not to.

Please give us a reasonable window to release a fix before any public
disclosure.

## Handling credentials

The SDK uses two server-side secrets. Both must be protected.

- **Secret key (`sk_live_...`)** authorises pay link creation and account
  reads. Treat it like a password.
- **Webhook signing secret (`whsec_...`)** verifies that a webhook genuinely
  came from KAELUM Pay.

Rules:

- Never put either secret in browser code, a mobile app bundle, a public
  repository, or a client-side environment variable.
- Load secrets from environment variables or a secrets manager.
- The publishable key (`pk_live_...`) is the only key safe to use in a
  browser.
- Rotate keys in the Developer Portal if you suspect exposure.

## Webhook safety

- Always verify the signature with `webhooks.constructEvent` before acting
  on a webhook. An unverified request is untrusted.
- Pass the raw request body to verification, never a re-serialised object.
- Keep webhook handlers idempotent so a retried delivery is harmless.

## Supported versions

Security fixes are applied to the latest published `0.x` release. Pin a
version in production and upgrade deliberately.

## Dependencies

The SDK ships with zero runtime dependencies, which keeps its supply-chain
surface minimal. Development dependencies are limited to the build and type
toolchain.
