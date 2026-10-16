import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PromotionService } from "./promotion.service";
import type { PromotionPreviewQuery } from "./promotion.validation";

const getPreview = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionService.getPreview(req.auth!.schoolId!, req.query as unknown as PromotionPreviewQuery);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Promotion list retrieved successfully!", data: result });
});

const promote = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionService.promote(req.auth!.schoolId!, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Students moved to the next year!", data: result });
});

const undo = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionService.undo(req.auth!.schoolId!, req.params.enrollmentId as string);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Move undone", data: result });
});

export const PromotionController = { getPreview, promote, undo };
