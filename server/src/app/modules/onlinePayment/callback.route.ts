import express, { type Request, type Response } from "express";
import { prisma } from "../../../../lib/prisma";
import { CheckoutService, schoolUrl } from "./checkout.service";

/*
 * Where SSLCommerz sends the payer back (success / fail / cancel, a form POST from its own
 * site) and where it tells our server about a payment (IPN). Mounted before the origin check:
 * these come from SSLCommerz, not from our pages. Nothing here is believed: a "success" is
 * recorded only after SSLCommerz's validation API confirms it (CheckoutService).
 */

const router = express.Router();
router.use(express.urlencoded({ extended: false, limit: "100kb" }));

const field = (req: Request, name: string) => {
  const v = (req.body as Record<string, unknown> | undefined)?.[name] ?? req.query[name];
  return typeof v === "string" ? v.trim().slice(0, 200) : "";
};

/* Back to the school's own page for this payment (the payer is logged in there). */
const sendBack = async (res: Response, tranId: string | null) => {
  const online = tranId ? await prisma.onlinePayment.findUnique({ where: { tranId }, select: { tranId: true, school: { select: { subdomain: true } } } }) : null;
  if (!online) return res.status(400).type("text/plain").send("Unknown payment");
  // 303: the browser follows with a GET (it arrived with a POST)
  res.redirect(303, `${schoolUrl(online.school.subdomain)}/fees/payment/${encodeURIComponent(online.tranId)}`);
};

router.post("/success", async (req, res) => {
  const tranId = field(req, "tran_id");
  const valId = field(req, "val_id");
  try {
    if (tranId && valId) await CheckoutService.confirmByValId(tranId, valId);
  } catch (error) {
    // the result page asks SSLCommerz again, so the payer is never left without an answer
    console.error("[sslcommerz] success failed:", (error as Error).message);
  }
  await sendBack(res, tranId || null);
});

router.post("/fail", async (req, res) => {
  const tranId = field(req, "tran_id");
  try {
    await CheckoutService.markUnpaid(tranId, "FAILED", field(req, "error") || field(req, "failedreason") || null);
  } catch (error) {
    console.error("[sslcommerz] fail failed:", (error as Error).message);
  }
  await sendBack(res, tranId || null);
});

router.post("/cancel", async (req, res) => {
  const tranId = field(req, "tran_id");
  try {
    await CheckoutService.markUnpaid(tranId, "CANCELLED", null);
  } catch (error) {
    console.error("[sslcommerz] cancel failed:", (error as Error).message);
  }
  await sendBack(res, tranId || null);
});

// SSLCommerz's server telling ours (never the payer's browser)
router.post("/ipn", async (req, res) => {
  const tranId = field(req, "tran_id");
  const valId = field(req, "val_id");
  try {
    if (tranId && valId && (field(req, "status") === "VALID" || field(req, "status") === "VALIDATED")) await CheckoutService.confirmByValId(tranId, valId);
    else if (tranId && field(req, "status")) await CheckoutService.markUnpaid(tranId, field(req, "status") === "CANCELLED" ? "CANCELLED" : "FAILED", field(req, "status"));
    res.type("text/plain").send("OK");
  } catch (error) {
    console.error("[sslcommerz] ipn failed:", (error as Error).message);
    // SSLCommerz tries the IPN again on an error
    res.status(500).type("text/plain").send("ERROR");
  }
});

export const sslcommerzCallbackRoutes = router;
