import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { imageUploadMiddleware } from "../../shared/imageUpload";
import { StudentController } from "./student.controller";
import { StudentValidation } from "./student.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

router.post(
  "/",
  authorize("student:create"),
  validateRequest({ body: StudentValidation.createStudent }),
  StudentController.createStudent,
);

router.get(
  "/",
  authorize("student:view"),
  validateRequest({ query: StudentValidation.listStudentsQuery }),
  StudentController.getStudents,
);

router.get(
  "/:studentId",
  authorize("student:view"),
  validateRequest({ params: StudentValidation.studentIdParams }),
  StudentController.getStudentById,
);

router.patch(
  "/:studentId",
  authorize("student:update"),
  validateRequest({
    params: StudentValidation.studentIdParams,
    body: StudentValidation.updateStudent,
  }),
  StudentController.updateStudent,
);

// section, group or roll in the current year (same class)
router.patch(
  "/:studentId/enrollment",
  authorize("student:update"),
  validateRequest({ params: StudentValidation.studentIdParams, body: StudentValidation.changePlacement }),
  StudentController.changePlacement,
);

// the photo: one image in the "file" field (multipart), resized to 400 px
router.put(
  "/:studentId/photo",
  authorize("student:update"),
  validateRequest({ params: StudentValidation.studentIdParams }),
  imageUploadMiddleware,
  StudentController.setPhoto,
);

router.delete(
  "/:studentId/photo",
  authorize("student:update"),
  validateRequest({ params: StudentValidation.studentIdParams }),
  StudentController.removePhoto,
);

export const studentRoutes = router;