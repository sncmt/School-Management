import express from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize, { superAdminOnly } from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AttendanceController } from "./attendance.controller";
import { AttendanceValidation } from "./attendance.validation";
import { mayTakeRollCall, myRollCallSections } from "./rollCallAccess";

const router = express.Router();

router.use(authenticate("SCHOOL"));

// ------------------------------------------------------- student roll call

// attendance:mark for any section, or the section's class teacher for their own (rollCallAccess.ts)
router.get(
  "/students/sheet",
  validateRequest({ query: AttendanceValidation.studentSheetQuery }),
  mayTakeRollCall,
  AttendanceController.getStudentSheet,
);

// up to 7 days back; older days also need attendance:edit_past (checked in the service)
router.put(
  "/students/sheet",
  validateRequest({ body: AttendanceValidation.saveStudentSheet }),
  mayTakeRollCall,
  AttendanceController.saveStudentSheet,
);

// the sections whose roll call this member may take (the app's teacher screens)
router.get(
  "/my-sections",
  catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Roll call sections retrieved successfully!",
      data: await myRollCallSections(req.auth!),
    }),
  ),
);

// a day's roll call taken by mistake: the school super admin only
router.delete(
  "/students/sheet",
  authorize("attendance:mark"),
  superAdminOnly,
  validateRequest({ query: AttendanceValidation.deleteStudentSheetQuery }),
  AttendanceController.deleteStudentSheet,
);

// ------------------------------------------------------------- reports

router.get(
  "/summary",
  authorize("attendance:view"),
  validateRequest({ query: AttendanceValidation.dayQuery }),
  AttendanceController.getDaySummary,
);

router.get(
  "/students/absent",
  authorize("attendance:view"),
  validateRequest({ query: AttendanceValidation.dayQuery }),
  AttendanceController.getAbsentees,
);

router.get(
  "/students/:studentId",
  authorize("attendance:view"),
  validateRequest({ params: AttendanceValidation.studentIdParams, query: AttendanceValidation.rangeQuery }),
  AttendanceController.getStudentReport,
);

router.get(
  "/sections/:sectionId/register",
  authorize("attendance:view"),
  validateRequest({ params: AttendanceValidation.sectionIdParams, query: AttendanceValidation.registerQuery }),
  AttendanceController.getSectionRegister,
);

// ------------------------------------------------------------- teachers

router.get(
  "/teachers/sheet",
  authorize("teacher_attendance:mark"),
  validateRequest({ query: AttendanceValidation.teacherSheetQuery }),
  AttendanceController.getTeacherSheet,
);

router.put(
  "/teachers/sheet",
  authorize("teacher_attendance:mark"),
  validateRequest({ body: AttendanceValidation.saveTeacherSheet }),
  AttendanceController.saveTeacherSheet,
);

router.delete(
  "/teachers/sheet",
  authorize("teacher_attendance:mark"),
  superAdminOnly,
  validateRequest({ query: AttendanceValidation.deleteTeacherSheetQuery }),
  AttendanceController.deleteTeacherSheet,
);

router.get(
  "/teachers/:teacherId",
  authorize("teacher_attendance:view"),
  validateRequest({ params: AttendanceValidation.teacherIdParams, query: AttendanceValidation.rangeQuery }),
  AttendanceController.getTeacherReport,
);

export const attendanceRoutes = router;
