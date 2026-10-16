import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ResultCardService } from "./resultCard.service";
import type { CardsQuery, RemarksQuery } from "./resultCard.validation";

const reply = (res: Response, message: string, data: unknown) =>
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });

const getSettings = catchAsync(async (req: Request, res: Response) => {
  reply(res, "Result card settings retrieved successfully!", await ResultCardService.getSettings(req.auth!.schoolId!));
});

const saveSettings = catchAsync(async (req: Request, res: Response) => {
  reply(res, "Result card settings saved!", await ResultCardService.saveSettings(req.auth!.schoolId!, req.auth!.userId, req.body));
});

const getCards = catchAsync(async (req: Request, res: Response) => {
  reply(res, "Result cards retrieved successfully!", await ResultCardService.getCards(req.auth!.schoolId!, req.query as unknown as CardsQuery));
});

const getRemarks = catchAsync(async (req: Request, res: Response) => {
  reply(res, "Remarks retrieved successfully!", await ResultCardService.getRemarks(req.auth!, req.query as unknown as RemarksQuery));
});

const saveRemarks = catchAsync(async (req: Request, res: Response) => {
  reply(res, "Remarks saved!", await ResultCardService.saveRemarks(req.auth!, req.body));
});

export const ResultCardController = { getSettings, saveSettings, getCards, getRemarks, saveRemarks };
