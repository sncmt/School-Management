import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import authenticate from "../../middlewares/auth";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";

const router = express.Router();

// any member of the school: each part of the summary checks its own permission
router.get(
  "/",
  authenticate("SCHOOL"),
  catchAsync(async (req: Request, res: Response) => {
    const result = await DashboardService.getSummary(req.auth!);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Dashboard retrieved successfully!", data: result });
  }),
);

export const dashboardRoutes = router;
