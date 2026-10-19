import { Request, Response } from "express";
import httpStatus from "http-status";
import type { SmsEvent } from "../../../../generated/prisma/enums";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { SmsService } from "./sms.service";
import type { SmsLogQuery, SmsRecipientsQuery } from "./sms.validation";

const ok = <T>(res: Response, message: string, data: T, statusCode: number = httpStatus.OK) =>
  sendResponse(res, { statusCode, success: true, message, data });

const getSettings = catchAsync(async (req: Request, res: Response) => {
  ok(res, "SMS settings retrieved", await SmsService.getSettings(req.auth!.schoolId!));
});

const updateSettings = catchAsync(async (req: Request, res: Response) => {
  ok(res, "SMS settings saved", await SmsService.updateSettings(req.auth!, req.body));
});

const listTemplates = catchAsync(async (req: Request, res: Response) => {
  ok(res, "SMS templates retrieved", await SmsService.listTemplates(req.auth!.schoolId!));
});

const updateTemplate = catchAsync(async (req: Request, res: Response) => {
  ok(res, "SMS template saved", await SmsService.updateTemplate(req.auth!, req.params.event as SmsEvent, req.body));
});

const listMessages = catchAsync(async (req: Request, res: Response) => {
  ok(res, "SMS log retrieved", await SmsService.listMessages(req.auth!.schoolId!, req.query as unknown as SmsLogQuery));
});

const previewRecipients = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Recipients counted", await SmsService.previewRecipients(req.auth!.schoolId!, req.query as unknown as SmsRecipientsQuery));
});

const sendByHand = catchAsync(async (req: Request, res: Response) => {
  const result = await SmsService.sendByHand(req.auth!, req.body);
  ok(res, `${result.queued} SMS queued`, result, httpStatus.CREATED);
});

export const SmsController = { getSettings, updateSettings, listTemplates, updateTemplate, listMessages, previewRecipients, sendByHand };
