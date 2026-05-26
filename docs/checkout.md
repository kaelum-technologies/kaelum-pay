# Embedded checkout

The embedded checkout widget keeps the customer on your own page. It loads
the KAELUM-hosted checkout in a modal overlay, so the customer pays without
a full-page redirect.

Import it from the `@kaelum/pay/checkout` entry point. This module is
browser-only and has no Node.js dependencies, so it is safe to bundle for
the client.

## The flow

1. Your **server** creates a pay link with `kaelum.paylinks.create()` and
   sends the `url` to the browser.
2. Your **browser** code calls `openCheckout({ url })`.
3. The customer pays inside the modal.
4. The widget reports the outcome through `onSuccess`, `onCancel`, or
   `onError`, then closes.

The secret key never touches the browser. Only the pay link URL does.

## openCheckout

```ts
import { openCheckout } from "@kaelum/pay/checkout";

const handle = openCheckout({
  url: paylinkUrl,
  onSuccess: (payment) => {
    console.log("Paid", payment.transactionId);
    window.location.href = "/thank-you";
  },
  onCancel: () => console.log("Customer cancelled"),
  onError: (message) => alert(message),
  onClose: () => console.log("Modal closed"),
});

// Close it yourself if you need to:
handle.close();
```

| Option | Type | Notes |
|---|---|---|
| `url` | `string` | The pay link URL. Required. |
| `onSuccess` | `(payment) => void` | Payment completed. |
| `onCancel` | `() => void` | Customer cancelled or dismissed. |
| `onError` | `(message) => void` | Checkout reported an error. |
| `onClose` | `() => void` | Modal closed, for any reason. |

The modal also closes when the customer presses Escape or clicks the
backdrop. Both count as a cancel.

## autowireCheckout

For static pages, wire up buttons declaratively. Any element with a
`data-kaelum-checkout` attribute becomes a checkout trigger; the attribute
value is the pay link URL.

```html
<button data-kaelum-checkout="https://kaelum.app/pay/abc123">
  Pay with KAELUM
</button>

<script type="module">
  import { autowireCheckout } from "@kaelum/pay/checkout";

  const teardown = autowireCheckout({
    onSuccess: () => location.assign("/thank-you"),
  });
  // teardown() removes the listener if you ever need to.
</script>
```

## Using it with a framework

The widget is framework-agnostic. In React, call `openCheckout` from an
event handler:

```tsx
import { openCheckout } from "@kaelum/pay/checkout";

function PayButton({ paylinkUrl }: { paylinkUrl: string }) {
  return (
    <button
      onClick={() =>
        openCheckout({ url: paylinkUrl, onSuccess: () => navigate("/done") })
      }
    >
      Pay with KAELUM
    </button>
  );
}
```

## How the callbacks are delivered

The widget listens for `window.postMessage` events from the hosted checkout
page and only acts on messages from that page's origin. The expected
message shape is:

```js
{ source: "kaelum-pay", type: "payment.succeeded", payment: { /* ... */ } }
```

See [`INTEGRATION_NOTES.md`](../INTEGRATION_NOTES.md) for the message
contract to confirm. The modal renders the checkout correctly regardless;
only the callbacks depend on the hosted page emitting these messages.
