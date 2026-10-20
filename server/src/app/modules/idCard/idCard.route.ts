import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { IdCardService } from "./idCard.service";
import { IdCardValidation, type IdCardsQuery } from "./idCard.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

const ok = <T>(res: Response, message: string, data: T) => sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });
const schoolOf = (req: Request) => req.auth!.schoolId!;

// printing comes with seeing students; the design with changing them
router.get(
  "/settings",
  authorize("student:view"),
  catchAsync(async (req, res) => ok(res, "ID card design retrieved successfully!", await IdCardService.getSettings(schoolOf(req)))),
);
router.put(
  "/settings",
  authorize("student:update"),
  validateRequest({ body: IdCardValidation.saveSettings }),
  catchAsync(async (req, res) => ok(res, "ID card design saved", await IdCardService.saveSettings(schoolOf(req), req.auth!.userId, req.body))),
);

router.get(
  "/school",
  authorize("student:view"),
  catchAsync(async (req, res) => ok(res, "School retrieved successfully!", await IdCardService.getSchool(schoolOf(req)))),
);

router.get(
  "/",
  authorize("student:view"),
  validateRequest({ query: IdCardValidation.cardsQuery }),
  catchAsync(async (req, res) => ok(res, "ID cards retrieved successfully!", await IdCardService.getCards(schoolOf(req), req.query as IdCardsQuery))),
);

export const idCardRoutes = router;
