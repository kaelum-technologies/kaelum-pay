/**
 * @kaelum/pay/checkout
 *
 * Browser embedded checkout widget for KAELUM Pay.
 *
 * This module renders a KAELUM Pay link inside a modal overlay on your own
 * page, so the customer never leaves your site. It has no Node.js
 * dependencies and is safe to bundle for the browser.
 *
 * The widget loads the hosted checkout page (`kaelum.app/pay/:embedToken`)
 * in a sandboxed iframe and listens for postMessage events from it. The
 * expected message contract is documented in INTEGRATION_NOTES.md.
 *
 * @example
 * ```ts
 * import { openCheckout } from "@kaelum/pay/checkout";
 *
 * // `paylinkUrl` comes from kaelum.paylinks.create() on your server.
 * openCheckout({
 *   url: paylinkUrl,
 *   onSuccess: (payment) => { window.location.href = "/thank-you"; },
 *   onCancel: () => console.log("Customer cancelled"),
 * });
 * ```
 */

/** A KAE payment result reported by the hosted checkout page. */
export interface CheckoutPaymentResult {
  /** Transaction identifier, when supplied by the checkout page. */
  transactionId?: string;
  /** Payment status. */
  status?: string;
  /** Any additional fields reported by the checkout page. */
  [key: string]: unknown;
}

/** Options for {@link openCheckout}. */
export interface CheckoutOptions {
  /**
   * The hosted pay link URL, from `kaelum.paylinks.create()`.
   * For example `https://kaelum.app/pay/abc123`.
   */
  url: string;
  /** Called when the customer completes the payment. */
  onSuccess?: (payment: CheckoutPaymentResult) => void;
  /** Called when the customer cancels or dismisses the checkout. */
  onCancel?: () => void;
  /** Called when the checkout reports an error. */
  onError?: (message: string) => void;
  /** Called whenever the modal closes, for any reason. */
  onClose?: () => void;
}

/** A handle to an open checkout modal. */
export interface CheckoutHandle {
  /** Close the checkout modal programmatically. */
  close(): void;
}

const STYLE_ID = "kaelum-pay-checkout-style";
const KAELUM_ORANGE = "#FF5C3D";
const KAELUM_DARK = "#0A0E1A";

/**
 * Open the KAELUM Pay checkout in a modal overlay.
 *
 * Returns a {@link CheckoutHandle}. The modal also closes when the customer
 * finishes, presses Escape, or clicks the backdrop.
 */
export function openCheckout(options: CheckoutOptions): CheckoutHandle {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("openCheckout can only be used in a browser environment.");
  }
  if (!options.url) {
    throw new Error("openCheckout requires a `url`.");
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(options.url).origin;
  } catch {
    throw new Error("openCheckout received an invalid `url`.");
  }

  injectStyles();

  const overlay = document.createElement("div");
  overlay.className = "kaelum-pay-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "KAELUM Pay checkout");

  const frameWrap = document.createElement("div");
  frameWrap.className = "kaelum-pay-frame-wrap";

  const closeButton = document.createElement("button");
  closeButton.className = "kaelum-pay-close";
  closeButton.setAttribute("aria-label", "Close checkout");
  closeButton.textContent = "\u00d7";

  const iframe = document.createElement("iframe");
  iframe.className = "kaelum-pay-frame";
  iframe.src = options.url;
  iframe.setAttribute("title", "KAELUM Pay");
  iframe.setAttribute(
    "allow",
    "payment; clipboard-write; accelerometer; autoplay",
  );

  frameWrap.append(closeButton, iframe);
  overlay.append(frameWrap);
  document.body.append(overlay);

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keydown", onKeyDown);
    document.body.style.overflow = previousOverflow;
    overlay.remove();
    options.onClose?.();
  };

  const onMessage = (event: MessageEvent): void => {
    if (event.origin !== expectedOrigin) return;
    const message = normaliseMessage(event.data);
    if (!message) return;

    switch (message.type) {
      case "payment.succeeded":
      case "success":
        options.onSuccess?.(message.payment ?? {});
        close();
        break;
      case "payment.cancelled":
      case "cancelled":
      case "cancel":
        options.onCancel?.();
        close();
        break;
      case "payment.failed":
      case "payment.error":
      case "error":
        options.onError?.(message.message ?? "The payment could not be completed.");
        close();
        break;
      case "close":
        close();
        break;
      default:
        break;
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      options.onCancel?.();
      close();
    }
  };

  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay) {
      options.onCancel?.();
      close();
    }
  });
  closeButton.addEventListener("click", () => {
    options.onCancel?.();
    close();
  });
  window.addEventListener("message", onMessage);
  window.addEventListener("keydown", onKeyDown);

  return { close };
}

/**
 * Wire up every element on the page that carries a `data-kaelum-checkout`
 * attribute. The attribute value is the pay link URL.
 *
 * ```html
 * <button data-kaelum-checkout="https://kaelum.app/pay/abc123">
 *   Pay with KAELUM
 * </button>
 * ```
 *
 * Call once after the DOM is ready. Returns a function that removes the
 * listeners again.
 */
export function autowireCheckout(
  handlers: Omit<CheckoutOptions, "url"> = {},
): () => void {
  if (typeof document === "undefined") {
    throw new Error("autowireCheckout can only be used in a browser environment.");
  }
  const onClick = (event: Event): void => {
    const target = event.target as Element | null;
    const trigger = target?.closest<HTMLElement>("[data-kaelum-checkout]");
    if (!trigger) return;
    const url = trigger.getAttribute("data-kaelum-checkout");
    if (!url) return;
    event.preventDefault();
    openCheckout({ ...handlers, url });
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

interface CheckoutMessage {
  type: string;
  payment?: CheckoutPaymentResult;
  message?: string;
}

/** Accept messages from the hosted checkout page in a few tolerated shapes. */
function normaliseMessage(data: unknown): CheckoutMessage | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  // Only act on messages that identify themselves as KAELUM Pay.
  const isKaelum =
    obj["source"] === "kaelum-pay" ||
    obj["kaelumPay"] === true ||
    obj["sender"] === "kaelum";
  if (!isKaelum) return null;

  const type = obj["type"] ?? obj["event"];
  if (typeof type !== "string") return null;

  return {
    type,
    payment: (obj["payment"] ?? obj["data"]) as CheckoutPaymentResult | undefined,
    message: typeof obj["message"] === "string" ? obj["message"] : undefined,
  };
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.kaelum-pay-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(10, 14, 26, 0.78);
  backdrop-filter: blur(4px);
  animation: kaelum-pay-fade 160ms ease-out;
}
.kaelum-pay-frame-wrap {
  position: relative;
  width: 100%;
  max-width: 460px;
  height: 100%;
  max-height: 720px;
  border-radius: 16px;
  overflow: hidden;
  background: ${KAELUM_DARK};
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 92, 61, 0.25);
}
.kaelum-pay-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
.kaelum-pay-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  color: #ffffff;
  background: ${KAELUM_ORANGE};
  transition: opacity 120ms ease;
}
.kaelum-pay-close:hover { opacity: 0.85; }
@keyframes kaelum-pay-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;
  document.head.append(style);
}

/** Convenience object grouping the checkout helpers. */
export const KaelumCheckout = { open: openCheckout, autowire: autowireCheckout };
