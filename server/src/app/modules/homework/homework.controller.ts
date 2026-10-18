import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { HomeworkService } from "./homework.service";
import type { FamilyHomeworkQuery, HomeworkListQuery } from "./homework.validation";

const ok = <T>(res: Response, message: string, data: T, statusCode: number = httpStatus.OK) =>
  sendResponse(res, { statusCode, success: true, message, data });

const id = (req: Request) => req.params.homeworkId as string;

const getOptions = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Homework options retrieved successfully!", await HomeworkService.getOptions(req.auth!));
});

const listHomework = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Homework retrieved successfully!", await HomeworkService.listHomework(req.auth!, req.query as unknown as HomeworkListQuery));
});

const getHomework = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Homework retrieved successfully!", await HomeworkService.getHomework(req.auth!, id(req)));
});

const createHomework = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Homework given!", await HomeworkService.createHomework(req.auth!, req.body), httpStatus.CREATED);
});

const updateHomework = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Homework updated successfully!", await HomeworkService.updateHomework(req.auth!, id(req), req.body));
});

const deleteHomework = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Homework deleted", await HomeworkService.deleteHomework(req.auth!, id(req)));
});

const saveChecks = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Homework checks saved", await HomeworkService.saveChecks(req.auth!, id(req), req.body));
});

const addAttachment = catchAsync(async (req: Request, res: Response) => {
  ok(res, "File attached", await HomeworkService.addAttachment(req.auth!, id(req), req.file!), httpStatus.CREATED);
});

const removeAttachment = catchAsync(async (req: Request, res: Response) => {
  ok(res, "File removed", await HomeworkService.removeAttachment(req.auth!, id(req), req.params.attachmentId as string));
});

const familyHomework = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Homework retrieved successfully!", await HomeworkService.familyHomework(req.auth!, req.query as unknown as FamilyHomeworkQuery));
});

export const HomeworkController = {
  getOptions,
  listHomework,
  getHomework,
  createHomework,
  updateHomework,
  deleteHomework,
  saveChecks,
  addAttachment,
  removeAttachment,
  familyHomework,
};
