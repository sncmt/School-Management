import express, { type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { RollNumberService } from "./rollNumber.service";
import { RollNumberValidation as V, type RollsQuery } from "./rollNumber.validation";

// Roll numbers of a class (or a section of it) for an academic year, set in one go.
const router = express.Router();
router.use(authenticate("SCHOOL"));

const ok = <T>(res: Response, message: string, data: T) => sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });

router.get(
  "/",
  authorize("student:view"),
  validateRequest({ query: V.rollsQuery }),
  catchAsync(async (req, res) =>
    ok(res, "Roll numbers retrieved successfully!", await RollNumberService.getRolls(req.auth!.schoolId!, req.query as unknown as RollsQuery)),
  ),
);

router.put(
  "/",
  authorize("student:update"),
  validateRequest({ body: V.saveRolls }),
  catchAsync(async (req, res) => {
    const result = await RollNumberService.saveRolls(req.auth!.schoolId!, req.body);
    ok(res, `${result.updated} roll number(s) saved`, result);
  }),
);

export const rollNumberRoutes = router;
