/**
 * Shared types for the KAELUM Pay SDK.
 *
 * Request parameter types mirror the live KAELUM MCP server tool schemas
 * exactly. Response types describe the expected shape of each tool result.
 * See INTEGRATION_NOTES.md for the confirmed-versus-expected breakdown.
 */

/** Lifecycle status of a KAE payment transaction. */
export type PaymentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";

/** Status of a KAELUM Pay link. */
export type PaylinkStatus = "ACTIVE" | "PAID" | "EXPIRED" | "DISABLED";

/** Options accepted by the {@link KaelumPay} constructor. */
export interface KaelumPayOptions {
  /**
   * Your KAELUM Pay developer secret key (`sk_live_...`).
   * Generate one at https://kaelum.app/developer/portal.
   * This is a server-side credential. Never ship it to a browser.
   */
  secretKey: string;
  /**
   * Base URL of the KAELUM MCP server.
   * Defaults to the production endpoint.
   */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /** Number of automatic retries for transient network failures. Defaults to 2. */
  maxRetries?: number;
  /**
   * Optional `fetch` implementation. Defaults to the global `fetch`
   * (available natively in Node.js 18 and later, and in browsers).
   */
  fetch?: typeof fetch;
}

/** A KAELUM Pay link created for a fixed-amount payment. */
export interface Paylink {
  /** Unique identifier for the pay link. */
  id: string;
  /** Hosted checkout URL. Redirect a customer here, or embed it. */
  url: string;
  /** Short-lived token embedded in the checkout URL (`/pay/:embedToken`). */
  embedToken?: string;
  /** Ready-to-paste, styled HTML embed button for this pay link. */
  embedHtml?: string;
  /** Amount charged, in GBP. */
  amountGbp: number;
  /** Description shown to the customer at checkout. */
  description: string;
  /** Current status of the pay link. */
  status?: PaylinkStatus;
  /** URL the customer is sent to after a completed payment. */
  redirectUrl?: string;
  /** URL that receives signed webhook events for this pay link. */
  webhookUrl?: string;
  /** Number of times this pay link has been paid. */
  usageCount?: number;
  /** ISO 8601 creation timestamp. */
  createdAt?: string;
}

/** Parameters for {@link Paylinks.create}. */
export interface PaylinkCreateParams {
  /** Amount to charge, in GBP (for example `49.99`). */
  amountGbp: number;
  /** What the payment is for. Shown to the customer at checkout. */
  description: string;
  /** Optional URL to send the customer to after a completed payment. */
  redirectUrl?: string;
  /** Optional URL to receive HMAC-SHA256 signed webhook events. */
  webhookUrl?: string;
}

/** Parameters for {@link Paylinks.list}. */
export interface PaylinkListParams {
  /** Maximum number of pay links to return. Defaults to 10. */
  limit?: number;
}

/** A KAE payment transaction between a customer and a merchant or creator. */
export interface PaymentTransaction {
  /** Unique transaction identifier. */
  transactionId: string;
  /** Current lifecycle status. */
  status: PaymentStatus;
  /** Amount of KAE moved by this transaction. */
  amountKlm: number;
  /** GBP equivalent of the KAE amount at transaction time. */
  amountGbp?: number;
  /** Account ID of the merchant or creator being paid. */
  merchantId: string;
  /** Optional caller-supplied reference, such as an order number. */
  reference?: string;
  /** ISO 8601 creation timestamp. */
  createdAt?: string;
}

/** A short-lived authenticated session for the server-to-server payment API. */
export interface AuthSession {
  /** Session token. Pass this to payment methods. Valid for roughly one hour. */
  sessionToken: string;
  /** ISO 8601 expiry timestamp, when provided by the server. */
  expiresAt?: string;
}

/** Parameters for {@link Auth.authenticate}. */
export interface AuthenticateParams {
  /** The KAELUM account number, shown on the account dashboard. */
  accountNumber: string;
  /** Personal API key, starting with `kaelum_user_`. */
  apiKey: string;
}

/** Parameters for {@link Payments.initiate}. */
export interface PaymentInitiateParams {
  /** Amount of KAE to send. Minimum 1. */
  amountKlm: number;
  /** Account ID of the merchant or creator to pay. */
  merchantId: string;
  /** Session token from {@link Auth.authenticate}. */
  sessionToken: string;
  /** Optional payment reference, such as an order number. */
  reference?: string;
}

/** The current KAE price. KAE is a fixed-price commerce currency and does not appreciate. */
export interface KlmPrice {
  /** Current price of one KAE, in GBP. */
  priceGbp: number;
  /** Currency code for the quoted price. */
  currency?: string;
  /** ISO 8601 timestamp the price was last assessed. */
  asOf?: string;
}

/** A KAELUM account balance summary. */
export interface AccountBalance {
  /** The account number or user ID this balance belongs to. */
  userId: string;
  /** KAE balance held by the account. */
  balanceKlm: number;
  /** GBP equivalent of the KAE balance. */
  balanceGbp?: number;
  /** Account tier (for example Customer, Creator, Merchant). */
  tier?: string;
  /** Account status. */
  status?: string;
}

/** A merchant or creator that can receive KAE payments. */
export interface Merchant {
  /** Account ID used as the `merchantId` when initiating a payment. */
  id: string;
  /** Display name of the merchant or creator. */
  name: string;
  /** Account tier. */
  tier?: string;
}

/** A developer API key belonging to your KAELUM Pay account. */
export interface DeveloperKey {
  /** Identifier for the key. */
  id: string;
  /** The publishable key (`pk_live_...`). Safe to use in a browser. */
  publishableKey?: string;
  /** Key status (for example active or revoked). */
  status?: string;
  /** ISO 8601 creation timestamp. */
  createdAt?: string;
}

/** Health summary of the K.A.T.E. (Kaelum Audivo Triovus Engine). */
export interface KateStatus {
  /** Overall engine status. */
  status: "OPERATIONAL" | "DEGRADED" | "INCIDENT" | string;
  /** Number of active K.A.T.E. agents. */
  activeAgents?: number;
  /** ISO 8601 timestamp of the last heartbeat. */
  lastHeartbeat?: string;
}

/** Webhook event types delivered by KAELUM Pay. */
export type WebhookEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "payment.cancelled"
  | "payment.expired"
  | "paylink.paid";

/** A verified webhook event delivered to your endpoint. */
export interface WebhookEvent<T = Record<string, unknown>> {
  /** Unique event identifier. */
  id: string;
  /** The type of event. */
  type: WebhookEventType | string;
  /** ISO 8601 time the event was created. */
  createdAt?: string;
  /** The event payload (a payment, a pay link, and so on). */
  data: T;
}
