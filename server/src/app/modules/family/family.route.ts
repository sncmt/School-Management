import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import authenticate from "../../middlewares/auth";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { familyHomeworkRoute } from "../homework/homework.route";
import { FamilyService } from "./family.service";

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

export const familyRoutes = router;
