import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { InvigilatorService } from "./invigilator.service";
import { SeatPlanService } from "./seatPlan.service";
import { SeatPlanValidation as V } from "./seatPlan.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

const ok = <T>(res: Response, message: string, data: T) => sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });
const schoolOf = (req: Request) => req.auth!.schoolId!;
const examOf = (req: Request) => req.params.examId as string;
const manage = authorize("exam:seat_plan");

// seeing the plan comes with seeing exams; changing it with the seat plan permission
router.get(
  "/exams/:examId",
  authorize("exam:view"),
  validateRequest({ params: V.examParams }),
  catchAsync(async (req, res) => ok(res, "Seat plan retrieved successfully!", await SeatPlanService.getPlan(schoolOf(req), examOf(req)))),
);

router.post(
  "/exams/:examId/generate",
  manage,
  validateRequest({ params: V.examParams, body: V.generate }),
  catchAsync(async (req, res) => ok(res, "Seat plan made!", await SeatPlanService.generate(req.auth!, examOf(req), req.body))),
);

router.delete(
  "/exams/:examId",
  manage,
  validateRequest({ params: V.examParams }),
  catchAsync(async (req, res) => ok(res, "Seat plan deleted", await SeatPlanService.deletePlan(schoolOf(req), examOf(req)))),
);

// a student to a seat (an empty one, or swap with whoever sits there)
router.post(
  "/exams/:examId/move",
  manage,
  validateRequest({ params: V.examParams, body: V.move }),
  catchAsync(async (req, res) => ok(res, "Seat changed", await SeatPlanService.move(schoolOf(req), examOf(req), req.body))),
);

router.delete(
  "/exams/:examId/seats/:enrollmentId",
  manage,
  validateRequest({ params: V.seatParams }),
  catchAsync(async (req, res) => ok(res, "Seat cleared", await SeatPlanService.clearSeat(schoolOf(req), examOf(req), req.params.enrollmentId as string))),
);

// late admissions into the empty seats
router.post(
  "/exams/:examId/fill",
  manage,
  validateRequest({ params: V.examParams }),
  catchAsync(async (req, res) => ok(res, "Students seated", await SeatPlanService.fillEmpty(schoolOf(req), examOf(req)))),
);

router.post(
  "/exams/:examId/rooms",
  manage,
  validateRequest({ params: V.examParams, body: V.addRoom }),
  catchAsync(async (req, res) => ok(res, "Room added to the plan", await SeatPlanService.addRoom(schoolOf(req), examOf(req), req.body.roomId))),
);

router.delete(
  "/exams/:examId/rooms/:roomId",
  manage,
  validateRequest({ params: V.roomParams }),
  catchAsync(async (req, res) => ok(res, "Room removed from the plan", await SeatPlanService.removeRoom(schoolOf(req), examOf(req), req.params.roomId as string))),
);

// ------------------------------------------------------- invigilator duties

// the logged-in teacher's own duties from today
router.get(
  "/my-duties",
  catchAsync(async (req, res) => ok(res, "Duties retrieved successfully!", await InvigilatorService.myDuties(req.auth!))),
);

router.get(
  "/exams/:examId/duties",
  authorize("exam:view"),
  validateRequest({ params: V.examParams }),
  catchAsync(async (req, res) => ok(res, "Duties retrieved successfully!", await InvigilatorService.getDuties(schoolOf(req), examOf(req)))),
);

router.post(
  "/exams/:examId/duties/auto",
  manage,
  validateRequest({ params: V.examParams, body: V.autoAssign }),
  catchAsync(async (req, res) => ok(res, "Duties assigned", await InvigilatorService.autoAssign(schoolOf(req), examOf(req), req.body.perRoom))),
);

// one room at one sitting
router.put(
  "/exams/:examId/duties",
  manage,
  validateRequest({ params: V.examParams, body: V.setDuty }),
  catchAsync(async (req, res) => ok(res, "Duty saved", await InvigilatorService.setRoomDuty(schoolOf(req), examOf(req), req.body))),
);

router.delete(
  "/exams/:examId/duties",
  manage,
  validateRequest({ params: V.examParams }),
  catchAsync(async (req, res) => ok(res, "Duties cleared", await InvigilatorService.clearDuties(schoolOf(req), examOf(req)))),
);

export const seatPlanRoutes = router;
