/**
 * KAELUM Pay example: webhook receiver.
 *
 * A standalone endpoint that verifies KAELUM Pay webhooks and dispatches on
 * the event type. This is the half of an integration that confirms, server
 * side, that a payment really happened.
 *
 *   npm install && npm start
 *
 * Point a KAELUM Pay webhook at http://your-host/webhooks/kaelum and the
 * verified events will print to the console.
 */

import express from "express";
import { KaelumPay, KaelumSignatureVerificationError } from "@kaelum/pay";

const kaelum = new KaelumPay({ secretKey: process.env.KAELUM_SECRET_KEY });
const WEBHOOK_SECRET = process.env.KAELUM_WEBHOOK_SECRET;
const PORT = process.env.PORT || 3002;

const app = express();

/**
 * The webhook route. Two things matter here:
 *   1. express.raw keeps the body as a Buffer, so the signed bytes are
 *      preserved. Do not use express.json on this route.
 *   2. The handler is idempotent: a retried delivery is harmless because
 *      fulfilment is keyed on the event id.
 */
const handled = new Set();

app.post("/webhooks/kaelum", express.raw({ type: "*/*" }), (req, res) => {
  let event;
  try {
    event = kaelum.webhooks.constructEvent(
      req.body,
      req.headers["kaelum-signature"],
      WEBHOOK_SECRET,
    );
  } catch (err) {
    if (err instanceof KaelumSignatureVerificationError) {
      console.warn("Rejected an unverified webhook.");
      return res.sendStatus(400);
    }
    console.error("Webhook error:", err.message);
    return res.sendStatus(400);
  }

  // Respond fast. Do slow work after responding.
  res.sendStatus(200);

  if (event.id && handled.has(event.id)) {
    console.log(`Skipping duplicate delivery of ${event.id}`);
    return;
  }
  if (event.id) handled.add(event.id);

  switch (event.type) {
    case "payment.succeeded":
    case "paylink.paid":
      console.log(`[${event.type}] fulfil order`, event.data);
      break;
    case "payment.failed":
    case "payment.cancelled":
    case "payment.expired":
      console.log(`[${event.type}] release order`, event.data);
      break;
    default:
      console.log(`[${event.type}] no handler`, event.data);
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  if (!WEBHOOK_SECRET) {
    console.warn("KAELUM_WEBHOOK_SECRET is not set. Verification will fail.");
  }
  console.log(`Webhook receiver listening on port ${PORT}`);
});
