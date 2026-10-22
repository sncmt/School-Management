import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { OnlineOfficeService } from "./office.service";
import { OnlinePaymentService } from "./onlinePayment.service";
import { OnlinePaymentValidation as V, type ListOnlineQuery } from "./onlinePayment.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

const ok = <T>(res: Response, message: string, data: T) => sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });
const schoolOf = (req: Request) => req.auth!.schoolId!;
const manage = authorize("online_payment:manage");

// the school's SSLCommerz store (the password is never sent back)
router.get(
  "/settings",
  manage,
  catchAsync(async (req, res) => ok(res, "Online payment settings retrieved successfully!", await OnlinePaymentService.getSettings(schoolOf(req)))),
);
router.put(
  "/settings",
  manage,
  validateRequest({ body: V.saveSettings }),
  catchAsync(async (req, res) => ok(res, "Online payment settings saved", await OnlinePaymentService.saveSettings(schoolOf(req), req.auth!.userId, req.body))),
);
router.post(
  "/settings/test",
  manage,
  catchAsync(async (req, res) => ok(res, "Connection tested", await OnlinePaymentService.testConnection(schoolOf(req)))),
);

// the payments guardians made (or started), with what SSLCommerz reported
router.get(
  "/payments",
  manage,
  validateRequest({ query: V.listQuery }),
  catchAsync(async (req, res) => ok(res, "Online payments retrieved successfully!", await OnlineOfficeService.list(schoolOf(req), req.query as unknown as ListOnlineQuery))),
);
router.post(
  "/payments/:id/check",
  manage,
  validateRequest({ params: V.idParams }),
  catchAsync(async (req, res) => ok(res, "Payment checked with SSLCommerz", await OnlineOfficeService.check(schoolOf(req), String(req.params.id)))),
);
router.post(
  "/payments/:id/refund",
  manage,
  validateRequest({ params: V.idParams, body: V.markRefund }),
  catchAsync(async (req, res) => ok(res, "Refund updated", await OnlineOfficeService.markRefund(schoolOf(req), String(req.params.id), req.body))),
);

export const onlinePaymentRoutes = router;
