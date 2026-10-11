import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ClassService } from "./class.service";
import type { ClassQuery } from "./class.type";

const createClass = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.createClass(req.auth!.schoolId!, req.body);

  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Class created successfully!", data: result });
});

const getClasses = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.getClasses(req.auth!.schoolId!, req.query as unknown as ClassQuery);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Classes retrieved successfully!", data: result });
});

const getClassById = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.getClassById(req.auth!.schoolId!, req.params.classId as string);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Class retrieved successfully!", data: result });
});

const updateClass = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.updateClass(req.auth!.schoolId!, req.params.classId as string, req.body);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Class updated successfully!", data: result });
});

const deleteClass = catchAsync(async (req: Request, res: Response) => {
  await ClassService.deleteClass(req.auth!.schoolId!, req.params.classId as string);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Class deleted successfully!", data: null });
});

export const ClassController = { createClass, getClasses, getClassById, updateClass, deleteClass };
