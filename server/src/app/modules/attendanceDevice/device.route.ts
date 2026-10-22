import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { DeviceService } from "./device.service";
import { PeopleService } from "./people.service";
import { DeviceValidation as V } from "./device.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"), authorize("attendance:devices"));

const ok = <T>(res: Response, message: string, data: T, statusCode: number = httpStatus.OK) =>
  sendResponse(res, { statusCode, success: true, message, data });
const schoolOf = (req: Request) => req.auth!.schoolId!;
const deviceOf = (req: Request) => req.params.deviceId as string;

router.get(
  "/",
  catchAsync(async (req, res) => ok(res, "Devices retrieved successfully!", await DeviceService.listDevices(schoolOf(req)))),
);

router.get(
  "/punches",
  validateRequest({ query: V.punchesQuery }),
  catchAsync(async (req, res) => {
    const { deviceId, limit } = req.query as unknown as { deviceId?: string; limit: number };
    ok(res, "Punches retrieved successfully!", await DeviceService.recentPunches(schoolOf(req), deviceId, limit));
  }),
);

// ------------------------------------------------------------- rules

router.get(
  "/rules",
  catchAsync(async (req, res) => ok(res, "Rules retrieved successfully!", await DeviceService.getRules(schoolOf(req)))),
);

router.put(
  "/rules",
  validateRequest({ body: V.saveRules }),
  catchAsync(async (req, res) => ok(res, "Rules saved", await DeviceService.saveRules(schoolOf(req), req.auth!.userId, req.body))),
);

// ------------------------------------------------------------- people

router.get(
  "/people",
  validateRequest({ query: V.peopleQuery }),
  catchAsync(async (req, res) => ok(res, "People retrieved successfully!", await PeopleService.listPeople(schoolOf(req), req.query as never))),
);

// a device number for everyone who has none (and the devices get them)
router.post(
  "/people/assign",
  catchAsync(async (req, res) => ok(res, "Numbers given", await PeopleService.assignNumbers(schoolOf(req)))),
);

router.put(
  "/people/:kind/:id/card",
  validateRequest({ params: V.personParams, body: V.setCard }),
  catchAsync(async (req, res) =>
    ok(res, "Card saved", await PeopleService.setCard(schoolOf(req), req.params.kind as "student" | "teacher", req.params.id as string, req.body.cardNumber)),
  ),
);

// everything the device should hold, sent afresh
router.post(
  "/:deviceId/sync",
  validateRequest({ params: V.deviceParams }),
  catchAsync(async (req, res) => ok(res, "Sending to the device", await PeopleService.syncDevice(schoolOf(req), deviceOf(req)))),
);

// ------------------------------------------------------------- devices

router.post(
  "/",
  validateRequest({ body: V.createDevice }),
  catchAsync(async (req, res) => ok(res, "Device added", await DeviceService.createDevice(schoolOf(req), req.body), httpStatus.CREATED)),
);

router.patch(
  "/:deviceId",
  validateRequest({ params: V.deviceParams, body: V.updateDevice }),
  catchAsync(async (req, res) => ok(res, "Device updated", await DeviceService.updateDevice(schoolOf(req), deviceOf(req), req.body))),
);

router.delete(
  "/:deviceId",
  validateRequest({ params: V.deviceParams }),
  catchAsync(async (req, res) => ok(res, "Device removed", await DeviceService.deleteDevice(schoolOf(req), deviceOf(req)))),
);

export const attendanceDeviceRoutes = router;
