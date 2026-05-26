/**
 * Error types raised by the KAELUM Pay SDK.
 *
 * Every error thrown by the SDK extends {@link KaelumError}, so a single
 * `catch (err) { if (err instanceof KaelumError) ... }` covers them all.
 */

/** Base class for all errors raised by the KAELUM Pay SDK. */
export class KaelumError extends Error {
  /** Machine-readable error code. */
  public readonly code: string;

  constructor(message: string, code = "kaelum_error") {
    super(message);
    this.name = "KaelumError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Raised when the KAELUM Pay API returns an error response, or when an
 * MCP tool call completes with an error result.
 */
export class KaelumApiError extends KaelumError {
  /** HTTP status code, when the error came from an HTTP response. */
  public readonly status?: number;
  /** The tool or endpoint that produced the error. */
  public readonly tool?: string;
  /** The raw error payload returned by the server, when available. */
  public readonly raw?: unknown;

  constructor(
    message: string,
    options: { status?: number; tool?: string; code?: string; raw?: unknown } = {},
  ) {
    super(message, options.code ?? "api_error");
    this.name = "KaelumApiError";
    this.status = options.status;
    this.tool = options.tool;
    this.raw = options.raw;
  }
}

/**
 * Raised when authentication fails: a missing, malformed, or rejected
 * secret key, session token, or user API key.
 */
export class KaelumAuthenticationError extends KaelumApiError {
  constructor(message: string, options: { status?: number; tool?: string; raw?: unknown } = {}) {
    super(message, { ...options, code: "authentication_error" });
    this.name = "KaelumAuthenticationError";
  }
}

/**
 * Raised when the SDK cannot reach the KAELUM Pay API: a network failure,
 * a timeout, or an unparseable response.
 */
export class KaelumConnectionError extends KaelumError {
  /** The underlying cause, when one is available. */
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, "connection_error");
    this.name = "KaelumConnectionError";
    this.cause = cause;
  }
}

/**
 * Raised by {@link Webhooks.constructEvent} when a webhook payload fails
 * signature verification. Treat this as a hostile request: never act on
 * the payload.
 */
export class KaelumSignatureVerificationError extends KaelumError {
  constructor(message: string) {
    super(message, "signature_verification_failed");
    this.name = "KaelumSignatureVerificationError";
  }
}

/** Raised when the SDK is given invalid arguments before any network call. */
export class KaelumInvalidRequestError extends KaelumError {
  constructor(message: string) {
    super(message, "invalid_request");
    this.name = "KaelumInvalidRequestError";
  }
}
