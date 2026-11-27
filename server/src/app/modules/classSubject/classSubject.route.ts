import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { ClassSubjectController } from "./classSubject.controller";
import { ClassSubjectValidation } from "./classSubject.validation";
import { ClassSubjectService } from "./classSubject.service";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";

const router = express.Router();

router.use(authenticate("SCHOOL"));

router.post(
  "/",
  authorize("class_subject:manage"),
  validateRequest({ body: ClassSubjectValidation.assignSubjects }),
  ClassSubjectController.assignSubjects,
);

router.get(
  "/",
  authorize("class_subject:view"),
  validateRequest({ query: ClassSubjectValidation.listQuery }),
  ClassSubjectController.getClassSubjects,
);

// a class's whole subject order at once (drag and drop); before "/:classSubjectId"
router.put(
  "/reorder",
  authorize("class_subject:manage"),
  validateRequest({ body: ClassSubjectValidation.reorder }),
  ClassSubjectController.reorderClassSubjects,
);

// how many "main or 4th" subjects a class (or group) takes as main
router.put(
  "/elective-rule",
  authorize("class_subject:manage"),
  validateRequest({ body: ClassSubjectValidation.setElectiveRule }),
  catchAsync(async (req, res) => {
    const data = await ClassSubjectService.setElectiveRule(req.auth!.schoolId!, req.body);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Saved", data });
  }),
);

router.patch(
  "/:classSubjectId",
  authorize("class_subject:manage"),
  validateRequest({
    params: ClassSubjectValidation.classSubjectIdParams,
    body: ClassSubjectValidation.updateClassSubject,
  }),
  ClassSubjectController.updateClassSubject,
);

router.delete(
  "/:classSubjectId",
  authorize("class_subject:manage"),
  validateRequest({ params: ClassSubjectValidation.classSubjectIdParams }),
  ClassSubjectController.removeClassSubject,
);

// full marks, pass marks, parts and grading scale: part of the result setup
router.put(
  "/:classSubjectId/marks",
  authorize("grading:manage"),
  validateRequest({ params: ClassSubjectValidation.classSubjectIdParams, body: ClassSubjectValidation.setMarks }),
  ClassSubjectController.setMarks,
);

export const classSubjectRoutes = router;
