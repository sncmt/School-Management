import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { NoticeService } from "./notice.service";
import type { NoticeBoardQuery, NoticeListQuery } from "./notice.validation";

const ok = <T>(res: Response, message: string, data: T, statusCode: number = httpStatus.OK) =>
  sendResponse(res, { statusCode, success: true, message, data });

const getBoard = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Notices retrieved successfully!", await NoticeService.getBoard(req.auth!, req.query as unknown as NoticeBoardQuery));
});

const markRead = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Notice marked as read", await NoticeService.markRead(req.auth!, req.params.noticeId as string));
});

const listNotices = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Notices retrieved successfully!", await NoticeService.listNotices(req.auth!, req.query as unknown as NoticeListQuery));
});

const getNotice = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Notice retrieved successfully!", await NoticeService.getNotice(req.auth!, req.params.noticeId as string));
});

const createNotice = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticeService.createNotice(req.auth!, req.body);
  ok(res, result.status === "PUBLISHED" ? "Notice published!" : "Notice saved as a draft", result, httpStatus.CREATED);
});

const updateNotice = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Notice updated successfully!", await NoticeService.updateNotice(req.auth!, req.params.noticeId as string, req.body));
});

const publishNotice = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Notice published!", await NoticeService.publishNotice(req.auth!, req.params.noticeId as string, req.body.publishAt));
});

const unpublishNotice = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Notice taken down", await NoticeService.unpublishNotice(req.auth!, req.params.noticeId as string));
});

const deleteNotice = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Notice deleted", await NoticeService.deleteNotice(req.auth!, req.params.noticeId as string));
});

const addAttachment = catchAsync(async (req: Request, res: Response) => {
  ok(res, "File attached", await NoticeService.addAttachment(req.auth!, req.params.noticeId as string, req.file!), httpStatus.CREATED);
});

const removeAttachment = catchAsync(async (req: Request, res: Response) => {
  const { noticeId, attachmentId } = req.params as { noticeId: string; attachmentId: string };
  ok(res, "File removed", await NoticeService.removeAttachment(req.auth!, noticeId, attachmentId));
});

const listPublic = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticeService.listPublic(req.params.subdomain as string, req.query as unknown as NoticeBoardQuery);
  ok(res, "Notices retrieved successfully!", result);
});

const getPublic = catchAsync(async (req: Request, res: Response) => {
  const { subdomain, noticeId } = req.params as { subdomain: string; noticeId: string };
  ok(res, "Notice retrieved successfully!", await NoticeService.getPublic(subdomain, noticeId));
});

export const NoticeController = {
  getBoard,
  markRead,
  listNotices,
  getNotice,
  createNotice,
  updateNotice,
  publishNotice,
  unpublishNotice,
  deleteNotice,
  addAttachment,
  removeAttachment,
  listPublic,
  getPublic,
};
