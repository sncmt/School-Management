import { SchoolUsersService } from "./schoolUsers.service";
import type { SchoolUsersQuery } from "./school.validation";
import { Request, Response } from "express";
import { SchoolService } from "./school.service";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import { GetAllSchoolsQuery } from "./school.type";


const createSchool = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.createSchool(req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "School created successfully!",
    data: result,
  });
});

const activateSchool = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.schoolId as string;
     // payments are recorded afterwards, on the Subscriptions page
     const result = await SchoolService.activateSchool(id)

    sendResponse(res, {statusCode: httpStatus.OK, success: true, message: "School is activated successfully!", data: result})
});


const getAllSchools = catchAsync(async (req: Request, res: Response) => {
    const query = req.query as unknown as GetAllSchoolsQuery;

    const result = await SchoolService.getAllSchools(query);

    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Schools retrieved successfully!", data: result });
});

const getPublicSite = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.getPublicSite(req.params.subdomain as string);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "School site retrieved successfully!", data: result });
});

const getSchoolById = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.getSchoolById(req.params.schoolId as string);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "School retrieved successfully!", data: result });
});

const updateSchool = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.updateSchool(req.params.schoolId as string, req.body);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "School updated successfully!", data: result });
});

const changeSchoolStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.changeSchoolStatus(req.params.schoolId as string, req.body.status);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "School status changed successfully!", data: result });
});

const resetSuperAdminPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.resetSuperAdminPassword(req.params.schoolId as string, req.auth!.userId);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Super admin password reset successfully!", data: result });
});

const brandingImage = (kind: "logo" | "favicon") => ({
  set: catchAsync(async (req: Request, res: Response) => {
    const result = await SchoolService.setBrandingImage(req.params.schoolId as string, kind, req.file!.buffer);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: `School ${kind} saved!`, data: result });
  }),
  remove: catchAsync(async (req: Request, res: Response) => {
    const result = await SchoolService.removeBrandingImage(req.params.schoolId as string, kind);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: `School ${kind} removed!`, data: result });
  }),
});

const logo = brandingImage("logo");
const favicon = brandingImage("favicon");

const listUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolUsersService.listUsers(req.params.schoolId as string, req.query as unknown as SchoolUsersQuery);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "School users retrieved successfully!", data: result });
});

const setUserPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolUsersService.setUserPassword(req.params.schoolId as string, req.params.userId as string, req.auth!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Password changed", data: result });
});

const passwordLog = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolUsersService.passwordLog(req.params.schoolId as string, req.query as unknown as { page: number; limit: number });
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Password changes retrieved successfully!", data: result });
});

export const SchoolController = {
  listUsers,
  setUserPassword,
  passwordLog,
  logo,
  favicon,
  createSchool,
  activateSchool,
  getAllSchools,
  getPublicSite,
  getSchoolById,
  updateSchool,
  changeSchoolStatus,
  resetSuperAdminPassword,
};
