/**
 * KAELUM Pay example: embedded checkout widget.
 *
 * A creator's digital product page. The server creates a KAELUM pay link,
 * then serves a page that opens the checkout inside a modal, so the buyer
 * pays without leaving the page.
 *
 *   npm install && npm start
 *   open http://localhost:3001
 *
 * The browser imports the SDK's checkout module, which this server serves
 * straight from the installed @kaelum/pay package. In a real build you
 * would import "@kaelum/pay/checkout" and let your bundler handle it.
 */

import { createRequire } from "node:module";
import express from "express";
import { KaelumPay } from "@kaelum/pay";

const require = createRequire(import.meta.url);
const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY });

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const PRODUCT = { name: "Lightroom preset pack", priceGbp: 12.0 };

const app = express();

// Serve the SDK's browser checkout bundle to the page.
app.get("/sdk/checkout.js", (_req, res) => {
  res.type("application/javascript");
  res.sendFile(require.resolve("@kaelum/pay/checkout"));
});

app.get("/", async (_req, res) => {
  let paylinkUrl;
  try {
    const link = await kaelum.paylinks.create({
      amountGbp: PRODUCT.priceGbp,
      description: PRODUCT.name,
    });
    paylinkUrl = link.url;
  } catch (err) {
    console.error("Could not create pay link:", err.message);
    return res.status(500).send("Could not load the product. Try again.");
  }

  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${PRODUCT.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0A0E1A; color: #fff;
           display: grid; place-items: center; min-height: 100vh; margin: 0; }
    .card { background: #11162a; padding: 32px; border-radius: 16px; text-align: center; }
    button { background: #FF5C3D; color: #fff; border: 0; padding: 12px 24px;
             border-radius: 8px; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${PRODUCT.name}</h1>
    <p>£${PRODUCT.priceGbp.toFixed(2)}</p>
    <button id="buy">Pay with KAELUM</button>
  </div>

  <script type="module">
    import { openCheckout } from "/sdk/checkout.js";

    document.getElementById("buy").addEventListener("click", () => {
      openCheckout({
        url: ${JSON.stringify(paylinkUrl)},
        onSuccess: (payment) => {
          document.querySelector(".card").innerHTML =
            "<h1>Thank you</h1><p>Your purchase is confirmed.</p>";
          console.log("Paid", payment);
        },
        onCancel: () => console.log("Checkout cancelled"),
        onError: (message) => alert(message),
      });
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Creator example running at ${BASE_URL}`);
});
