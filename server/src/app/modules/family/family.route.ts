import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import { z } from "zod";
import authenticate from "../../middlewares/auth";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { familyAdmitCardRoute } from "../admitCard/admitCard.route";
import { familyHomeworkRoute } from "../homework/homework.route";
import validateRequest from "../../errorHandler/validateRequest";
import { CheckoutService } from "../onlinePayment/checkout.service";
import { OnlinePaymentValidation } from "../onlinePayment/onlinePayment.validation";
import { FamilyService } from "./family.service";
import { FamilyPaymentsService } from "./familyPayments.service";

const router = express.Router();

// the family login (GUARDIAN role): its own children only, so no permission is needed
router.get(
  "/",
  authenticate("SCHOOL"),
  catchAsync(async (req: Request, res: Response) => {
    const result = await FamilyService.getHome(req.auth!);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Family home retrieved successfully!", data: result });
  }),
);

// one child's homework, with the teacher's ticks
router.get("/homework", authenticate("SCHOOL"), ...familyHomeworkRoute);

// one child's admit card for an exam, once the school has released it
router.get("/admit-card", authenticate("SCHOOL"), ...familyAdmitCardRoute);

// ----------------------------------------------- paying fees online (SSLCommerz)

const ok = <T>(res: Response, message: string, data: T) => sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });

// a child's fees owed now, and the school's convenience charge
router.get(
  "/pay/:studentId",
  authenticate("SCHOOL"),
  validateRequest({ params: OnlinePaymentValidation.studentParams }),
  catchAsync(async (req, res) => ok(res, "Payment options retrieved successfully!", await CheckoutService.getOptions(req.auth!, req.params.studentId as string))),
);

// the chosen fees: answers with the SSLCommerz page to go to
router.post(
  "/pay",
  authenticate("SCHOOL"),
  validateRequest({ body: OnlinePaymentValidation.startPayment }),
  catchAsync(async (req, res) => ok(res, "Payment started", await CheckoutService.start(req.auth!, req.body.studentId, req.body.feeIds))),
);

// what became of a payment (asks SSLCommerz while it is still waiting)
router.get(
  "/pay/result/:tranId",
  authenticate("SCHOOL"),
  validateRequest({ params: OnlinePaymentValidation.tranParams }),
  catchAsync(async (req, res) => ok(res, "Payment retrieved successfully!", await CheckoutService.getResult(req.auth!, req.params.tranId as string))),
);

// ----------------------------------------------- the children's fee payments and receipts

const paymentsQuery = z.object({
  studentId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const paymentParams = z.object({ paymentId: z.string().trim().min(1, "Payment is required!") });

router.get(
  "/payments",
  authenticate("SCHOOL"),
  validateRequest({ query: paymentsQuery }),
  catchAsync(async (req, res) =>
    ok(res, "Payments retrieved successfully!", await FamilyPaymentsService.list(req.auth!, req.query as unknown as z.infer<typeof paymentsQuery>)),
  ),
);

router.get(
  "/payments/:paymentId/receipt",
  authenticate("SCHOOL"),
  validateRequest({ params: paymentParams }),
  catchAsync(async (req, res) => ok(res, "Receipt retrieved successfully!", await FamilyPaymentsService.getReceipt(req.auth!, req.params.paymentId as string))),
);

// ----------------------------------------------- a child's attendance, a month at a time

const attendanceQuery = z.object({
  studentId: z.string().trim().min(1, "Student is required!"),
  // "2026-10"
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the month format YYYY-MM"),
});

router.get(
  "/attendance",
  authenticate("SCHOOL"),
  validateRequest({ query: attendanceQuery }),
  catchAsync(async (req, res) =>
    ok(res, "Attendance retrieved successfully!", await FamilyService.getAttendanceMonth(req.auth!, req.query as unknown as z.infer<typeof attendanceQuery>)),
  ),
);

// ----------------------------------------------- a child's published exam results

const studentQuery = z.object({ studentId: z.string().trim().min(1, "Student is required!") });
const examParams = z.object({ examId: z.string().trim().min(1, "Exam is required!") });

router.get(
  "/results",
  authenticate("SCHOOL"),
  validateRequest({ query: studentQuery }),
  catchAsync(async (req, res) => ok(res, "Results retrieved successfully!", await FamilyService.getResults(req.auth!, req.query.studentId as string))),
);

// the full marksheet of one exam
router.get(
  "/results/:examId",
  authenticate("SCHOOL"),
  validateRequest({ params: examParams, query: studentQuery }),
  catchAsync(async (req, res) =>
    ok(res, "Result retrieved successfully!", await FamilyService.getResult(req.auth!, req.query.studentId as string, req.params.examId as string)),
  ),
);

// ----------------------------------------------- a child's weekly class routine

router.get(
  "/routine",
  authenticate("SCHOOL"),
  validateRequest({ query: studentQuery }),
  catchAsync(async (req, res) => ok(res, "Routine retrieved successfully!", await FamilyService.getRoutine(req.auth!, req.query.studentId as string))),
);

export const familyRoutes = router;
