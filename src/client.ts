/**
 * The KAELUM Pay client.
 *
 * `KaelumPay` is the single entry point for the server-side SDK. Construct
 * it once with your developer secret key and reuse it across requests.
 */

import { McpTransport } from "./transport.js";
import { KaelumInvalidRequestError } from "./errors.js";
import { Paylinks } from "./resources/paylinks.js";
import { Auth, Payments } from "./resources/payments.js";
import { Balances, DeveloperKeys, Kate, Klm, Merchants } from "./resources/data.js";
import { Webhooks } from "./webhooks.js";
import type { KaelumPayOptions } from "./types.js";

/**
 * Accept KLM, the Ai-governed closed-loop digital commerce currency, as a
 * payment option on any website or app.
 *
 * @example
 * ```ts
 * import { KaelumPay } from "@kaelum/pay";
 *
 * const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY! });
 *
 * const link = await kaelum.paylinks.create({
 *   amountGbp: 24.00,
 *   description: "One month subscription",
 * });
 * console.log(link.url);
 * ```
 */
export class KaelumPay {
  /** Create and list hosted pay links. */
  public readonly paylinks: Paylinks;
  /** Authenticate accounts for the server-to-server payment API. */
  public readonly auth: Auth;
  /** Initiate, confirm, cancel, and check KLM payments. */
  public readonly payments: Payments;
  /** Retrieve the current KLM price. */
  public readonly klm: Klm;
  /** Retrieve KAELUM account balances. */
  public readonly balances: Balances;
  /** Browse the merchant and creator directory. */
  public readonly merchants: Merchants;
  /** List your developer API keys. */
  public readonly developerKeys: DeveloperKeys;
  /** Check K.A.T.E. engine health. */
  public readonly kate: Kate;
  /** Verify and parse incoming webhooks. */
  public readonly webhooks: Webhooks;

  constructor(options: KaelumPayOptions) {
    if (!options || typeof options.secretKey !== "string" || !options.secretKey.trim()) {
      throw new KaelumInvalidRequestError(
        "A KAELUM Pay `secretKey` is required. Generate one at https://kaelum.app/developer/portal.",
      );
    }
    if (!options.secretKey.startsWith("sk_")) {
      throw new KaelumInvalidRequestError(
        "The `secretKey` looks invalid. It should start with `sk_live_`. " +
          "Do not pass a publishable key (`pk_live_`) here.",
      );
    }

    const secretKey = options.secretKey;
    const transport = new McpTransport({
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      fetch: options.fetch,
    });

    this.paylinks = new Paylinks(transport, secretKey);
    this.auth = new Auth(transport);
    this.payments = new Payments(transport);
    this.klm = new Klm(transport);
    this.balances = new Balances(transport);
    this.merchants = new Merchants(transport);
    this.developerKeys = new DeveloperKeys(transport, secretKey);
    this.kate = new Kate(transport);
    this.webhooks = new Webhooks();
  }
}
