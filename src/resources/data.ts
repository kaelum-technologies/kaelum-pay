/**
 * Read-only KAELUM resources: KLM price, account balances, the merchant
 * directory, developer keys, and K.A.T.E. engine status.
 */

import type { McpTransport } from "../transport.js";
import { KaelumInvalidRequestError } from "../errors.js";
import type {
  AccountBalance,
  DeveloperKey,
  KateStatus,
  KlmPrice,
  Merchant,
} from "../types.js";

/** The current KLM price, governed by the K.A.T.E. engine. */
export class Klm {
  constructor(private readonly transport: McpTransport) {}

  /** Retrieve the current KLM price. */
  async price(): Promise<KlmPrice> {
    const raw = await this.transport.call("kaelum_get_klm_price", {});
    return {
      priceGbp: Number(
        raw["priceGbp"] ?? raw["price_gbp"] ?? raw["price"] ?? raw["current_price_gbp"] ?? 0,
      ),
      currency: optionalString(raw["currency"]) ?? "GBP",
      asOf: optionalString(raw["asOf"] ?? raw["as_of"] ?? raw["timestamp"]),
    };
  }
}

/** KAELUM account balances. */
export class Balances {
  constructor(private readonly transport: McpTransport) {}

  /** Retrieve the balance summary for a KAELUM account. */
  async retrieve(userId: string): Promise<AccountBalance> {
    if (!userId?.trim()) {
      throw new KaelumInvalidRequestError("`userId` is required.");
    }
    const raw = await this.transport.call("kaelum_get_user_balance", {
      user_id: userId,
    });
    return {
      userId,
      balanceKlm: Number(raw["balanceKlm"] ?? raw["balance_klm"] ?? raw["balance"] ?? 0),
      balanceGbp: optionalNumber(raw["balanceGbp"] ?? raw["balance_gbp"]),
      tier: optionalString(raw["tier"] ?? raw["account_tier"]),
      status: optionalString(raw["status"] ?? raw["account_status"]),
    };
  }
}

/** The KAELUM merchant and creator directory. */
export class Merchants {
  constructor(private readonly transport: McpTransport) {}

  /**
   * List merchants and creators that can receive KLM payments.
   *
   * @param query - Optional keyword to filter the directory.
   */
  async list(query?: string): Promise<Merchant[]> {
    const raw = await this.transport.call(
      "kaelum_get_merchants",
      query ? { query } : {},
    );
    const items = pickArray(raw, ["merchants", "data", "items", "results"]);
    return items.map((item) => ({
      id: String(item["id"] ?? item["merchant_id"] ?? item["account_id"] ?? ""),
      name: String(item["name"] ?? item["merchant_name"] ?? ""),
      tier: optionalString(item["tier"]),
    }));
  }
}

/** Your KAELUM Pay developer API keys. */
export class DeveloperKeys {
  constructor(
    private readonly transport: McpTransport,
    private readonly secretKey: string,
  ) {}

  /** List the developer API keys on your account. */
  async list(): Promise<DeveloperKey[]> {
    const raw = await this.transport.call("kaelum_get_developer_keys", {
      developer_secret_key: this.secretKey,
    });
    const items = pickArray(raw, ["keys", "data", "items", "results"]);
    return items.map((item) => ({
      id: String(item["id"] ?? item["key_id"] ?? ""),
      publishableKey: optionalString(item["publishableKey"] ?? item["publishable_key"]),
      status: optionalString(item["status"]),
      createdAt: optionalString(item["createdAt"] ?? item["created_at"]),
    }));
  }
}

/** Health of the K.A.T.E. (Kaelum Audivo Triovus Engine). */
export class Kate {
  constructor(private readonly transport: McpTransport) {}

  /** Retrieve the current K.A.T.E. engine status. */
  async status(): Promise<KateStatus> {
    const raw = await this.transport.call("kaelum_get_kate_status", {});
    return {
      status: String(raw["overall_status"] ?? raw["status"] ?? "OPERATIONAL"),
      activeAgents: optionalNumber(
        raw["active_agent_count"] ?? raw["agents_active"] ?? raw["activeAgents"],
      ),
      lastHeartbeat: optionalString(
        raw["last_assessment"] ?? raw["lastHeartbeat"] ?? raw["last_heartbeat"],
      ),
    };
  }
}

function pickArray(
  raw: Record<string, unknown>,
  keys: string[],
): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  for (const key of keys) {
    const value = raw[key];
    if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  }
  return [];
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null ? undefined : Number(value);
}
