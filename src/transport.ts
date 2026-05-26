/**
 * Transport layer for the KAELUM Pay SDK.
 *
 * The KAELUM Pay API is exposed as an MCP (Model Context Protocol) server
 * over JSON-RPC 2.0. This module is the only place in the SDK that speaks
 * the wire protocol: every resource method calls {@link McpTransport.call}
 * with a tool name and arguments, and receives a parsed result back.
 */

import {
  KaelumApiError,
  KaelumAuthenticationError,
  KaelumConnectionError,
} from "./errors.js";
import { VERSION } from "./version.js";

/** The production KAELUM MCP endpoint. */
export const DEFAULT_BASE_URL =
  "https://kaelum-mcp.kaelumtechnologies.workers.dev/mcp";

/** Parsed result of an MCP tool call. */
export type McpResult = Record<string, unknown>;

interface TransportOptions {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: unknown;
    isError?: boolean;
  };
  error?: { code: number; message: string; data?: unknown };
}

/** Speaks JSON-RPC 2.0 to the KAELUM MCP server. */
export class McpTransport {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private requestId = 0;

  constructor(options: TransportOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;

    const resolvedFetch = options.fetch ?? globalThis.fetch;
    if (typeof resolvedFetch !== "function") {
      throw new KaelumConnectionError(
        "No `fetch` implementation found. Use Node.js 18 or later, or pass a `fetch` option.",
      );
    }
    this.fetchImpl = resolvedFetch;
  }

  /**
   * Call a KAELUM MCP tool by name and return its parsed result.
   *
   * @param tool - The MCP tool name, for example `kaelum_create_paylink`.
   * @param args - Arguments for the tool, in the server's snake_case form.
   */
  async call(tool: string, args: Record<string, unknown>): Promise<McpResult> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: ++this.requestId,
      method: "tools/call",
      params: { name: tool, arguments: args },
    });

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.send(tool, body);
      } catch (err) {
        lastError = err;
        // API and authentication errors are deterministic. Do not retry them.
        if (err instanceof KaelumApiError) throw err;
        if (attempt < this.maxRetries) {
          await delay(250 * 2 ** attempt);
          continue;
        }
      }
    }
    throw lastError instanceof Error
      ? new KaelumConnectionError(
          `Could not reach the KAELUM Pay API: ${lastError.message}`,
          lastError,
        )
      : new KaelumConnectionError("Could not reach the KAELUM Pay API.");
  }

  private async send(tool: string, body: string): Promise<McpResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "User-Agent": `kaelum-pay-node/${VERSION}`,
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      throw new KaelumConnectionError(
        err instanceof Error && err.name === "AbortError"
          ? `Request timed out after ${this.timeoutMs}ms.`
          : "Network request failed.",
        err,
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new KaelumAuthenticationError(
        "The KAELUM Pay API rejected the request credentials.",
        { status: response.status, tool, raw: text },
      );
    }
    if (!response.ok) {
      throw new KaelumApiError(
        `The KAELUM Pay API returned HTTP ${response.status}.`,
        { status: response.status, tool, raw: text },
      );
    }

    const rpc = parseJsonRpc(text);

    if (rpc.error) {
      throw new KaelumApiError(rpc.error.message || "MCP call failed.", {
        tool,
        code: `rpc_${rpc.error.code}`,
        raw: rpc.error.data ?? rpc.error,
      });
    }

    const result = rpc.result ?? {};
    const parsed = extractResult(result);
    return unwrapEnvelope(parsed, tool, result.isError === true);
  }
}

/**
 * KAELUM MCP tools return a standard envelope:
 * `{ success, data, meta, timestamp, api_version, platform }`.
 * This unwraps the envelope to the `data` payload, and turns an
 * unsuccessful response into a typed error.
 */
function unwrapEnvelope(
  parsed: McpResult,
  tool: string,
  isError: boolean,
): McpResult {
  const hasEnvelope =
    typeof parsed["success"] === "boolean" && "data" in parsed;
  const failed = isError || parsed["success"] === false;

  if (failed) {
    const message = errorMessage(parsed);
    if (/auth|unauthor|invalid key|forbidden|secret key/i.test(message)) {
      throw new KaelumAuthenticationError(message, { tool, raw: parsed });
    }
    throw new KaelumApiError(message, { tool, raw: parsed });
  }

  if (hasEnvelope) {
    const data = parsed["data"];
    if (data && typeof data === "object") return data as McpResult;
    return { value: data };
  }
  return parsed;
}

/** Pull a human-readable message out of an error payload. */
function errorMessage(parsed: McpResult): string {
  const candidate = parsed["error"] ?? parsed["message"];
  if (typeof candidate === "string" && candidate) return candidate;
  if (candidate && typeof candidate === "object") {
    const nested = (candidate as Record<string, unknown>)["message"];
    if (typeof nested === "string" && nested) return nested;
  }
  return "The KAELUM Pay tool returned an error.";
}

/** Parse a JSON-RPC response, accepting both plain JSON and SSE framing. */
function parseJsonRpc(text: string): JsonRpcResponse {
  const trimmed = text.trim();
  // Server-sent events framing: pull the JSON out of the last `data:` line.
  if (trimmed.startsWith("event:") || trimmed.includes("\ndata:")) {
    const dataLines = trimmed
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    const payload = dataLines[dataLines.length - 1];
    if (payload) {
      return JSON.parse(payload) as JsonRpcResponse;
    }
  }
  try {
    return JSON.parse(trimmed) as JsonRpcResponse;
  } catch {
    throw new KaelumConnectionError(
      "The KAELUM Pay API returned a response that could not be parsed.",
    );
  }
}

/** Turn an MCP tool result into a plain object. */
function extractResult(result: NonNullable<JsonRpcResponse["result"]>): McpResult {
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent as McpResult;
  }
  const textBlock = result.content?.find((block) => block.type === "text");
  const raw = textBlock?.text ?? "";
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as McpResult;
    return { value: parsed };
  } catch {
    // Not JSON: return the human-readable text under a `message` key.
    return { message: raw };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
