# Changelog

All notable changes to `@kaelum/pay` are documented here. This project
follows [Semantic Versioning](https://semver.org).

## [Unreleased]

### Changed
- The KAELUM commerce currency unit is now named KAE (formerly KLM). All
  documentation, type descriptions and comments use KAE.
- Method and field names that contain `klm` (for example `klm.price` and
  `amountKlm`) are unchanged, so existing integrations keep working.
  They refer to KAE.

## [0.1.0] - 2026-05-24

Initial release.

### Added
- `KaelumPay` client wrapping the live KAELUM MCP server.
- Hosted Paylink support: `paylinks.create`, `paylinks.list`.
- Server-to-server payments: `auth.authenticate`, `payments.initiate`,
  `payments.confirm`, `payments.cancel`, `payments.status`.
- Read-only resources: `klm.price`, `balances.retrieve`, `merchants.list`,
  `developerKeys.list`, `kate.status`.
- HMAC-SHA256 webhook verification: `webhooks.constructEvent`,
  `webhooks.verify`, with optional replay protection.
- Browser embedded checkout widget at the `@kaelum/pay/checkout` entry
  point: `openCheckout`, `autowireCheckout`.
- Typed error hierarchy rooted at `KaelumError`.
- Dual ESM and CommonJS builds with full TypeScript declarations.
- Zero runtime dependencies.
