import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { FinanceReport } from "./finance.report";
import { FinanceService } from "./finance.service";
import type { CollectionReportQuery, DuesReportQuery } from "./finance.validation";

const getSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await FinanceService.getSettings(req.auth!.schoolId!);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Finance settings retrieved successfully!", data: result });
});

const saveSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await FinanceService.saveSettings(req.auth!.schoolId!, req.auth!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Finance settings saved!", data: result });
});

const getCollectionReport = catchAsync(async (req: Request, res: Response) => {
  const result = await FinanceReport.getCollection(req.auth!.schoolId!, req.query as unknown as CollectionReportQuery);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Collection report retrieved successfully!", data: result });
});

const getDuesReport = catchAsync(async (req: Request, res: Response) => {
  const result = await FinanceReport.getDues(req.auth!.schoolId!, req.query as unknown as DuesReportQuery);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Dues report retrieved successfully!", data: result });
});

export const FinanceController = { getSettings, saveSettings, getCollectionReport, getDuesReport };
