import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { RoomService } from "./room.service";
import { RoomValidation } from "./room.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

const ok = <T>(res: Response, message: string, data: T, statusCode: number = httpStatus.OK) =>
  sendResponse(res, { statusCode, success: true, message, data });
const schoolOf = (req: Request) => req.auth!.schoolId!;
const roomOf = (req: Request) => req.params.roomId as string;

// seeing rooms comes with seeing exams; changing them with the seat plan permission
router.get(
  "/",
  authorize("exam:view"),
  validateRequest({ query: RoomValidation.listQuery }),
  catchAsync(async (req, res) => ok(res, "Rooms retrieved successfully!", await RoomService.listRooms(schoolOf(req), req.query as { includeInactive?: boolean }))),
);

router.post(
  "/",
  authorize("exam:seat_plan"),
  validateRequest({ body: RoomValidation.createRoom }),
  catchAsync(async (req, res) => ok(res, "Room added successfully!", await RoomService.createRoom(schoolOf(req), req.body), httpStatus.CREATED)),
);

router.post(
  "/bulk",
  authorize("exam:seat_plan"),
  validateRequest({ body: RoomValidation.createRooms }),
  catchAsync(async (req, res) => ok(res, "Rooms added successfully!", await RoomService.createRooms(schoolOf(req), req.body), httpStatus.CREATED)),
);

router.patch(
  "/:roomId",
  authorize("exam:seat_plan"),
  validateRequest({ params: RoomValidation.roomIdParams, body: RoomValidation.updateRoom }),
  catchAsync(async (req, res) => ok(res, "Room updated successfully!", await RoomService.updateRoom(schoolOf(req), roomOf(req), req.body))),
);

router.delete(
  "/:roomId",
  authorize("exam:seat_plan"),
  validateRequest({ params: RoomValidation.roomIdParams }),
  catchAsync(async (req, res) => ok(res, "Room deleted", await RoomService.deleteRoom(schoolOf(req), roomOf(req)))),
);

export const roomRoutes = router;
