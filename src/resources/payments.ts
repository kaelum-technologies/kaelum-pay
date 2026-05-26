/**
 * Server-to-server KLM payments.
 *
 * This is the direct payment API. It moves KLM from a customer account to
 * a merchant or creator account. Use it when you are building an agent, a
 * point-of-sale flow, or any integration that holds a customer session.
 *
 * The flow is two-step and deliberate:
 *   1. {@link Payments.initiate} returns a PENDING transaction.
 *   2. After the customer confirms the details, {@link Payments.confirm}
 *      executes the transfer. A confirmed transfer cannot be reversed.
 */

import type { McpTransport } from "../transport.js";
import { KaelumInvalidRequestError } from "../errors.js";
import type {
  AuthenticateParams,
  AuthSession,
  PaymentInitiateParams,
  PaymentTransaction,
} from "../types.js";

/** Authenticate a KAELUM account for the server-to-server payment API. */
export class Auth {
  constructor(private readonly transport: McpTransport) {}

  /**
   * Exchange an account number and personal API key for a session token.
   * The token is valid for roughly one hour.
   *
   * @example
   * ```ts
   * const session = await kaelum.auth.authenticate({
   *   accountNumber: "KA-100245",
   *   apiKey: process.env.KAELUM_USER_KEY!,
   * });
   * ```
   */
  async authenticate(params: AuthenticateParams): Promise<AuthSession> {
    if (!params.accountNumber?.trim()) {
      throw new KaelumInvalidRequestError("`accountNumber` is required.");
    }
    if (!params.apiKey?.trim()) {
      throw new KaelumInvalidRequestError("`apiKey` is required.");
    }

    const result = await this.transport.call("kaelum_authenticate", {
      account_number: params.accountNumber,
      api_key: params.apiKey,
    });

    const token = result["sessionToken"] ?? result["session_token"] ?? result["token"];
    if (typeof token !== "string" || !token) {
      throw new KaelumInvalidRequestError(
        "Authentication did not return a session token.",
      );
    }
    return {
      sessionToken: token,
      expiresAt: optionalString(result["expiresAt"] ?? result["expires_at"]),
    };
  }
}

/** Initiate, confirm, cancel, and check KLM payments. */
export class Payments {
  constructor(private readonly transport: McpTransport) {}

  /**
   * Initiate a KLM payment. Returns a PENDING transaction with full
   * details. Always present those details to the customer and require
   * explicit confirmation before calling {@link Payments.confirm}.
   */
  async initiate(params: PaymentInitiateParams): Promise<PaymentTransaction> {
    if (!(params.amountKlm >= 1)) {
      throw new KaelumInvalidRequestError("`amountKlm` must be at least 1.");
    }
    if (!params.merchantId?.trim()) {
      throw new KaelumInvalidRequestError("`merchantId` is required.");
    }
    if (!params.sessionToken?.trim()) {
      throw new KaelumInvalidRequestError("`sessionToken` is required.");
    }

    const result = await this.transport.call("kaelum_payment_initiate", {
      amount_klm: params.amountKlm,
      merchant_id: params.merchantId,
      session_token: params.sessionToken,
      ...(params.reference ? { reference: params.reference } : {}),
    });
    return toTransaction(result);
  }

  /**
   * Confirm and execute a previously initiated payment.
   * This transfers KLM and cannot be reversed.
   */
  async confirm(sessionToken: string, transactionId: string): Promise<PaymentTransaction> {
    requireToken(sessionToken);
    requireTransactionId(transactionId);
    const result = await this.transport.call("kaelum_payment_confirm", {
      session_token: sessionToken,
      transaction_id: transactionId,
    });
    return toTransaction(result);
  }

  /** Cancel a payment that is still PENDING. */
  async cancel(sessionToken: string, transactionId: string): Promise<PaymentTransaction> {
    requireToken(sessionToken);
    requireTransactionId(transactionId);
    const result = await this.transport.call("kaelum_payment_cancel", {
      session_token: sessionToken,
      transaction_id: transactionId,
    });
    return toTransaction(result);
  }

  /**
   * Check the current status of a transaction. Accepts either a session
   * token or a read-only API key.
   *
   * @example
   * ```ts
   * const tx = await kaelum.payments.status("txn_abc123", {
   *   sessionToken: session.sessionToken,
   * });
   * ```
   */
  async status(
    transactionId: string,
    auth: { sessionToken?: string; apiKey?: string },
  ): Promise<PaymentTransaction> {
    requireTransactionId(transactionId);
    if (!auth.sessionToken && !auth.apiKey) {
      throw new KaelumInvalidRequestError(
        "Provide either a `sessionToken` or an `apiKey` to check status.",
      );
    }
    const result = await this.transport.call("kaelum_payment_status", {
      transaction_id: transactionId,
      ...(auth.sessionToken ? { session_token: auth.sessionToken } : {}),
      ...(auth.apiKey ? { api_key: auth.apiKey } : {}),
    });
    return toTransaction(result);
  }
}

/** Normalise a raw MCP result into a {@link PaymentTransaction}. */
export function toTransaction(raw: Record<string, unknown>): PaymentTransaction {
  const get = (...keys: string[]): unknown => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null) return raw[key];
    }
    return undefined;
  };
  return {
    transactionId: String(
      get("transactionId", "transaction_id", "id", "txn_id") ?? "",
    ),
    status: String(get("status") ?? "PENDING") as PaymentTransaction["status"],
    amountKlm: Number(get("amountKlm", "amount_klm", "amount") ?? 0),
    amountGbp: optionalNumber(get("amountGbp", "amount_gbp")),
    merchantId: String(get("merchantId", "merchant_id") ?? ""),
    reference: optionalString(get("reference")),
    createdAt: optionalString(get("createdAt", "created_at", "created")),
  };
}

function requireToken(token: string): void {
  if (!token?.trim()) {
    throw new KaelumInvalidRequestError("A session token is required.");
  }
}

function requireTransactionId(id: string): void {
  if (!id?.trim()) {
    throw new KaelumInvalidRequestError("A transaction ID is required.");
  }
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null ? undefined : Number(value);
}
