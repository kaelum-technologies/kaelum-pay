/**
 * @kaelum/pay
 *
 * Official SDK for KAELUM Pay. Accept KAE, the Ai-governed closed-loop
 * digital commerce currency, as a payment option on any website or app.
 *
 * Server-side entry point. For the browser checkout widget, import from
 * `@kaelum/pay/checkout` instead.
 *
 * Documentation: https://github.com/kaelum-technologies/kaelum-pay
 */

export { KaelumPay } from "./client.js";
export { Webhooks } from "./webhooks.js";
export { DEFAULT_BASE_URL } from "./transport.js";
export { VERSION } from "./version.js";

export {
  KaelumError,
  KaelumApiError,
  KaelumAuthenticationError,
  KaelumConnectionError,
  KaelumSignatureVerificationError,
  KaelumInvalidRequestError,
} from "./errors.js";

export type { ConstructEventOptions } from "./webhooks.js";

export type {
  KaelumPayOptions,
  Paylink,
  PaylinkCreateParams,
  PaylinkListParams,
  PaylinkStatus,
  PaymentTransaction,
  PaymentStatus,
  PaymentInitiateParams,
  AuthSession,
  AuthenticateParams,
  KlmPrice,
  AccountBalance,
  Merchant,
  DeveloperKey,
  KateStatus,
  WebhookEvent,
  WebhookEventType,
} from "./types.js";
