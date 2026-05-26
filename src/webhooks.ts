/**
 * Webhook verification.
 *
 * KAELUM Pay signs every webhook delivery with HMAC-SHA256, using the
 * signing secret shown when you register a webhook endpoint. Always verify
 * the signature before acting on a webhook: an unverified request is an
 * untrusted request.
 *
 * Pass the *raw, unparsed* request body to {@link Webhooks.constructEvent}.
 * Parsing the body to JSON first and then re-serialising it will change
 * the bytes and break verification.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { KaelumSignatureVerificationError } from "./errors.js";
import type { WebhookEvent } from "./types.js";

/** Options for {@link Webhooks.constructEvent}. */
export interface ConstructEventOptions {
  /**
   * Maximum age of a webhook, in seconds, when the signature header
   * carries a timestamp. Deliveries older than this are rejected as a
   * defence against replay. Set to 0 to disable the check. Defaults to 300.
   */
  toleranceSeconds?: number;
}

/** Verify and parse incoming KAELUM Pay webhooks. */
export class Webhooks {
  /**
   * Verify a webhook signature and return the parsed event.
   *
   * @param rawBody - The raw request body, exactly as received.
   * @param signatureHeader - The value of the `Kaelum-Signature` header.
   * @param signingSecret - Your webhook signing secret (`whsec_...`).
   * @throws {@link KaelumSignatureVerificationError} when verification fails.
   *
   * @example
   * ```ts
   * app.post("/webhooks/kaelum", express.raw({ type: "*\/*" }), (req, res) => {
   *   try {
   *     const event = kaelum.webhooks.constructEvent(
   *       req.body,
   *       req.headers["kaelum-signature"] as string,
   *       process.env.KAELUM_WEBHOOK_SECRET!,
   *     );
   *     if (event.type === "payment.succeeded") fulfilOrder(event.data);
   *     res.sendStatus(200);
   *   } catch {
   *     res.sendStatus(400);
   *   }
   * });
   * ```
   */
  constructEvent(
    rawBody: string | Buffer,
    signatureHeader: string | undefined,
    signingSecret: string,
    options: ConstructEventOptions = {},
  ): WebhookEvent {
    if (!this.verify(rawBody, signatureHeader, signingSecret, options)) {
      throw new KaelumSignatureVerificationError(
        "Webhook signature verification failed. The request was not accepted.",
      );
    }
    const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new KaelumSignatureVerificationError(
        "Webhook body could not be parsed as JSON.",
      );
    }
    const obj = (parsed ?? {}) as Record<string, unknown>;
    return {
      id: String(obj["id"] ?? obj["event_id"] ?? ""),
      type: String(obj["type"] ?? obj["event"] ?? ""),
      createdAt: optionalString(obj["createdAt"] ?? obj["created_at"] ?? obj["created"]),
      data: (obj["data"] ?? obj["payload"] ?? obj) as Record<string, unknown>,
    };
  }

  /**
   * Verify a webhook signature without parsing the body.
   * Returns `true` when the signature is valid, `false` otherwise.
   * Never throws.
   */
  verify(
    rawBody: string | Buffer,
    signatureHeader: string | undefined,
    signingSecret: string,
    options: ConstructEventOptions = {},
  ): boolean {
    if (!signatureHeader || !signingSecret) return false;

    const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const parts = parseSignatureHeader(signatureHeader);

    // Optional replay protection when the header carries a timestamp.
    const tolerance = options.toleranceSeconds ?? 300;
    if (parts.timestamp !== undefined && tolerance > 0) {
      const ageSeconds = Math.abs(Date.now() / 1000 - parts.timestamp);
      if (ageSeconds > tolerance) return false;
    }

    // When a timestamp is present, it is part of the signed payload.
    const signedPayload =
      parts.timestamp !== undefined ? `${parts.timestamp}.${payload}` : payload;
    const expected = createHmac("sha256", signingSecret)
      .update(signedPayload, "utf8")
      .digest("hex");

    return parts.signatures.some((candidate) => safeEqual(candidate, expected));
  }
}

interface ParsedSignature {
  timestamp?: number;
  signatures: string[];
}

/**
 * Parse a signature header. Supports three common encodings:
 *   - a bare hex digest: `a1b2c3...`
 *   - a prefixed digest: `sha256=a1b2c3...`
 *   - a timestamped, comma-separated form: `t=1700000000,v1=a1b2c3...`
 */
function parseSignatureHeader(header: string): ParsedSignature {
  const value = header.trim();
  const signatures: string[] = [];
  let timestamp: number | undefined;

  if (value.includes("=") && value.includes(",")) {
    for (const segment of value.split(",")) {
      const [key, raw] = segment.split("=").map((s) => s.trim());
      if (!key || !raw) continue;
      if (key === "t") {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) timestamp = parsed;
      } else if (key.startsWith("v")) {
        signatures.push(raw.toLowerCase());
      }
    }
  } else if (value.toLowerCase().startsWith("sha256=")) {
    signatures.push(value.slice(7).toLowerCase());
  } else {
    signatures.push(value.toLowerCase());
  }

  return { timestamp, signatures };
}

/** Constant-time string comparison over hex digests. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}
