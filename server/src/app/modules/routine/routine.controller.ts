import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { RoutineService } from "./routine.service";
import { RoutineTemplateService } from "./routineTemplate.service";
import type {
  DayQuery,
  FreeTeachersQuery,
  MyDayQuery,
  SectionWeekQuery,
  SubstitutionsQuery,
  TeacherWeekQuery,
  YearQuery,
} from "./routine.validation";

const reply = (res: Response, statusCode: number, message: string, data: unknown) =>
  sendResponse(res, { statusCode, success: true, message, data });

const schoolOf = (req: Request) => req.auth!.schoolId!;
const q = <T>(req: Request) => req.query as unknown as T;

// ------------------------------------------------------------ period templates

const createTemplate = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.CREATED, "Period template created successfully!", await RoutineTemplateService.createTemplate(schoolOf(req), req.body));
});

const getTemplates = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Period templates retrieved successfully!", await RoutineTemplateService.getTemplates(schoolOf(req)));
});

const getTemplateById = catchAsync(async (req: Request, res: Response) => {
  const result = await RoutineTemplateService.getTemplateById(schoolOf(req), req.params.templateId as string);
  reply(res, httpStatus.OK, "Period template retrieved successfully!", result);
});

const updateTemplate = catchAsync(async (req: Request, res: Response) => {
  const result = await RoutineTemplateService.updateTemplate(schoolOf(req), req.params.templateId as string, req.body);
  reply(res, httpStatus.OK, "Period template updated successfully!", result);
});

const deleteTemplate = catchAsync(async (req: Request, res: Response) => {
  await RoutineTemplateService.deleteTemplate(schoolOf(req), req.params.templateId as string);
  reply(res, httpStatus.OK, "Period template deleted successfully!", null);
});

// ------------------------------------------------------------- routine entries

const createEntry = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.CREATED, "Class added to the routine!", await RoutineService.createEntry(schoolOf(req), req.body));
});

const updateEntry = catchAsync(async (req: Request, res: Response) => {
  const result = await RoutineService.updateEntry(schoolOf(req), req.params.entryId as string, req.body);
  reply(res, httpStatus.OK, "Routine class updated!", result);
});

const deleteEntry = catchAsync(async (req: Request, res: Response) => {
  await RoutineService.deleteEntry(schoolOf(req), req.params.entryId as string);
  reply(res, httpStatus.OK, "Class removed from the routine!", null);
});

// ---------------------------------------------------------------------- views

const getSectionWeek = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Section routine retrieved successfully!", await RoutineService.getSectionWeek(schoolOf(req), q<SectionWeekQuery>(req)));
});

const getTeacherWeek = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Teacher routine retrieved successfully!", await RoutineService.getTeacherWeek(schoolOf(req), q<TeacherWeekQuery>(req)));
});

const getWorkload = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Teacher workload retrieved successfully!", await RoutineService.getWorkload(schoolOf(req), q<YearQuery>(req)));
});

const getDay = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Routine of the day retrieved successfully!", await RoutineService.getDay(schoolOf(req), q<DayQuery>(req)));
});

const getMyWeek = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Your routine retrieved successfully!", await RoutineService.getMyWeek(req.auth!));
});

const getMyDay = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Your classes retrieved successfully!", await RoutineService.getMyDay(req.auth!, q<MyDayQuery>(req)));
});

// --------------------------------------------------------------- substitutes

const getFreeTeachers = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Free teachers retrieved successfully!", await RoutineService.getFreeTeachers(schoolOf(req), q<FreeTeachersQuery>(req)));
});

const createSubstitution = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Substitute teacher assigned!", await RoutineService.createSubstitution(req.auth!, req.body));
});

const deleteSubstitution = catchAsync(async (req: Request, res: Response) => {
  await RoutineService.deleteSubstitution(schoolOf(req), req.params.substitutionId as string);
  reply(res, httpStatus.OK, "Substitution removed!", null);
});

const getSubstitutions = catchAsync(async (req: Request, res: Response) => {
  reply(res, httpStatus.OK, "Substitutions retrieved successfully!", await RoutineService.getSubstitutions(schoolOf(req), q<SubstitutionsQuery>(req)));
});

export const RoutineController = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  createEntry,
  updateEntry,
  deleteEntry,
  getSectionWeek,
  getTeacherWeek,
  getWorkload,
  getDay,
  getMyWeek,
  getMyDay,
  getFreeTeachers,
  createSubstitution,
  deleteSubstitution,
  getSubstitutions,
};
