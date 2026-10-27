import { Request, Response } from "express";
import httpStatus from "http-status";
import type { NotificationType } from "../../../../generated/prisma/enums";
import { AppError } from "../../errorHandler/AppError";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { NotificationService } from "./notification.service";
import { PushService } from "./push.service";
import type { NotificationListQuery } from "./notification.validation";

const ok = <T>(res: Response, message: string, data: T) => sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });

const listMine = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Messages retrieved successfully!", await NotificationService.listMine(req.auth!, req.query as unknown as NotificationListQuery));
});

const unreadCount = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Unread count retrieved", await NotificationService.unreadCountMine(req.auth!));
});

const markRead = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Message marked as read", await NotificationService.markRead(req.auth!, req.params.notificationId as string));
});

const markAllRead = catchAsync(async (req: Request, res: Response) => {
  ok(res, "All messages marked as read", await NotificationService.markAllRead(req.auth!));
});

const getSettings = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Message settings retrieved", await NotificationService.getSettings(req.auth!.schoolId!));
});

const setTypeEnabled = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Message setting saved", await NotificationService.setTypeEnabled(req.auth!, req.params.type as NotificationType, req.body.enabled));
});

// ------------------------------------------------- the mobile app's phones (push notifications)

const registerDevice = catchAsync(async (req: Request, res: Response) => {
  // a platform owner working inside a school has no phone of their own there
  if (req.auth!.isPlatformAdmin) throw new AppError("Log in to the school to get its notifications", httpStatus.FORBIDDEN);
  ok(res, "Device registered", await PushService.register(req.auth!, req.body));
});

const unregisterDevice = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Device removed", await PushService.unregister(req.body.token));
});

export const NotificationController = { listMine, unreadCount, markRead, markAllRead, getSettings, setTypeEnabled, registerDevice, unregisterDevice };
