/**
 * KAELUM Pay example: hosted Paylink redirect.
 *
 * A minimal shop. The customer clicks "Buy", the server creates a KAELUM
 * pay link, and the customer is redirected to the hosted checkout. When the
 * payment completes, KAELUM Pay calls the webhook and the customer is
 * returned to the thank-you page.
 *
 *   npm install && npm start
 *   open http://localhost:3000
 */

import express from "express";
import { KaelumPay } from "@kaelum/pay";

const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY });

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const app = express();

// A single product, for the sake of the example.
const PRODUCT = { name: "KAELUM hoodie", priceGbp: 39.0 };

app.get("/", (_req, res) => {
  res.type("html").send(`
    <h1>${PRODUCT.name}</h1>
    <p>£${PRODUCT.priceGbp.toFixed(2)}</p>
    <form action="/checkout" method="post">
      <button type="submit">Buy with KAELUM</button>
    </form>
  `);
});

// Create a pay link and redirect the customer to the hosted checkout.
app.post("/checkout", express.urlencoded({ extended: false }), async (_req, res) => {
  try {
    const link = await kaelum.paylinks.create({
      amountGbp: PRODUCT.priceGbp,
      description: PRODUCT.name,
      redirectUrl: `${BASE_URL}/thank-you`,
      webhookUrl: `${BASE_URL}/webhooks/kaelum`,
    });
    res.redirect(link.url);
  } catch (err) {
    console.error("Could not create pay link:", err.message);
    res.status(500).send("Could not start checkout. Try again.");
  }
});

app.get("/thank-you", (_req, res) => {
  res.type("html").send("<h1>Thank you</h1><p>Your payment is being confirmed.</p>");
});

// KAELUM Pay calls this when the payment settles.
app.post("/webhooks/kaelum", express.raw({ type: "*/*" }), (req, res) => {
  try {
    const event = kaelum.webhooks.constructEvent(
      req.body,
      req.headers["kaelum-signature"],
      process.env.KAELUM_WEBHOOK_SECRET,
    );
    if (event.type === "payment.succeeded") {
      console.log("Payment succeeded:", event.data);
      // Fulfil the order here.
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook rejected:", err.message);
    res.sendStatus(400);
  }
});

app.listen(PORT, () => {
  console.log(`Merchant example running at ${BASE_URL}`);
});
