import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { NotificationService } from "./notification.service";
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

export const NotificationController = { listMine, unreadCount, markRead, markAllRead };
