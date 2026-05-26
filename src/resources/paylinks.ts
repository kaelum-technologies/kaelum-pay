/**
 * Pay links: fixed-amount hosted checkout pages.
 *
 * A pay link is the simplest way to accept KLM. Create one server-side,
 * then either redirect the customer to {@link Paylink.url} or render the
 * embedded checkout widget against it. See `docs/checkout.md`.
 */

import type { McpTransport } from "../transport.js";
import { KaelumInvalidRequestError } from "../errors.js";
import type { Paylink, PaylinkCreateParams, PaylinkListParams } from "../types.js";

/** Create and list KAELUM Pay links. */
export class Paylinks {
  constructor(
    private readonly transport: McpTransport,
    private readonly secretKey: string,
  ) {}

  /**
   * Create a fixed-amount pay link.
   *
   * The returned {@link Paylink.url} is a hosted checkout page. Redirect a
   * customer to it, or pass it to the embedded checkout widget. Customers
   * receive the standard 6%+ KLM spending discount automatically.
   *
   * @example
   * ```ts
   * const link = await kaelum.paylinks.create({
   *   amountGbp: 49.99,
   *   description: "Order #1024",
   *   redirectUrl: "https://shop.example.com/thank-you",
   *   webhookUrl: "https://shop.example.com/webhooks/kaelum",
   * });
   * // Send the customer to link.url
   * ```
   */
  async create(params: PaylinkCreateParams): Promise<Paylink> {
    if (!(params.amountGbp > 0)) {
      throw new KaelumInvalidRequestError("`amountGbp` must be greater than 0.");
    }
    if (!params.description?.trim()) {
      throw new KaelumInvalidRequestError("`description` is required.");
    }

    const result = await this.transport.call("kaelum_create_paylink", {
      amount_gbp: params.amountGbp,
      description: params.description,
      developer_secret_key: this.secretKey,
      ...(params.redirectUrl ? { redirect_url: params.redirectUrl } : {}),
      ...(params.webhookUrl ? { webhook_url: params.webhookUrl } : {}),
    });

    return toPaylink(result);
  }

  /**
   * List your existing pay links, most recent first.
   *
   * @example
   * ```ts
   * const links = await kaelum.paylinks.list({ limit: 25 });
   * ```
   */
  async list(params: PaylinkListParams = {}): Promise<Paylink[]> {
    const result = await this.transport.call("kaelum_list_paylinks", {
      developer_secret_key: this.secretKey,
      ...(params.limit ? { limit: params.limit } : {}),
    });

    const items = pickArray(result);
    return items.map(toPaylink);
  }
}

/** Normalise a raw MCP result into a {@link Paylink}. */
export function toPaylink(raw: Record<string, unknown>): Paylink {
  const get = (...keys: string[]): unknown => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null) return raw[key];
    }
    return undefined;
  };

  return {
    id: String(get("id", "paylink_id", "embedToken", "embed_token") ?? ""),
    url: String(get("url", "payment_url", "paymentUrl", "checkout_url") ?? ""),
    embedToken: asOptionalString(get("embedToken", "embed_token", "token")),
    embedHtml: asOptionalString(get("embedHtml", "embed_html", "html")),
    amountGbp: Number(get("amountGbp", "amount_gbp", "amount") ?? 0),
    description: String(get("description") ?? ""),
    status: asOptionalString(get("status")) as Paylink["status"],
    redirectUrl: asOptionalString(get("redirectUrl", "redirect_url")),
    webhookUrl: asOptionalString(get("webhookUrl", "webhook_url")),
    usageCount: asOptionalNumber(get("usageCount", "usage_count", "uses")),
    createdAt: asOptionalString(get("createdAt", "created_at", "created")),
  };
}

function pickArray(result: Record<string, unknown>): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  for (const key of ["paylinks", "data", "items", "results"]) {
    const value = result[key];
    if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  }
  return [];
}

function asOptionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

function asOptionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null ? undefined : Number(value);
}
