import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { RoleService } from "./role.service";

const schoolOf = (req: Request) => req.auth!.schoolId!;
const reply = (res: Response, statusCode: number, message: string, data: unknown) => sendResponse(res, { statusCode, success: true, message, data });

const getRoles = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Roles retrieved successfully!", await RoleService.getRoles(schoolOf(req)));
});

const createRole = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.CREATED, "Role created successfully!", await RoleService.createRole(schoolOf(req), req.body));
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Role updated successfully!", await RoleService.updateRole(schoolOf(req), req.params.roleId as string, req.body));
});

const deleteRole = catchAsync(async (req: Request, res: Response) => {
  await RoleService.deleteRole(schoolOf(req), req.params.roleId as string);
  reply(res, httpStatus.OK, "Role deleted successfully!", null);
});

const getStaff = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Staff retrieved successfully!", await RoleService.getStaff(schoolOf(req)));
});

const addStaff = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.CREATED, "Staff member added successfully!", await RoleService.addStaff(schoolOf(req), req.body));
});

const setStaffRoles = catchAsync(async (req: Request, res: Response) => {
  const result = await RoleService.setStaffRoles(schoolOf(req), req.params.membershipId as string, req.body.roleIds);
  reply(res, httpStatus.OK, "Roles updated successfully!", result);
});

export const RoleController = { getRoles, createRole, updateRole, deleteRole, getStaff, addStaff, setStaffRoles };
