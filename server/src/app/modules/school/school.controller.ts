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
  const result = await SchoolService.resetSuperAdminPassword(req.params.schoolId as string);

  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Super admin password reset successfully!", data: result });
});

export const SchoolController = {
  createSchool,
  activateSchool,
  getAllSchools,
  getPublicSite,
  getSchoolById,
  updateSchool,
  changeSchoolStatus,
  resetSuperAdminPassword,
};
