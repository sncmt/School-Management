import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import { attachmentUploadMiddleware } from "../../shared/attachmentUpload";
import { HomeworkController } from "./homework.controller";
import { HomeworkValidation } from "./homework.validation";

const router = express.Router();

// Subject teachers act on their own subjects and sections without a permission, so the
// service checks every request (homework:manage / homework:view for the rest of the school).
router.use(authenticate("SCHOOL"));

// what the person may give homework for this year
router.get("/options", HomeworkController.getOptions);

router.get("/", validateRequest({ query: HomeworkValidation.listQuery }), HomeworkController.listHomework);
router.post("/", validateRequest({ body: HomeworkValidation.createHomework }), HomeworkController.createHomework);

router.get("/:homeworkId", validateRequest({ params: HomeworkValidation.homeworkIdParams }), HomeworkController.getHomework);
router.patch(
  "/:homeworkId",
  validateRequest({ params: HomeworkValidation.homeworkIdParams, body: HomeworkValidation.updateHomework }),
  HomeworkController.updateHomework,
);
router.delete("/:homeworkId", validateRequest({ params: HomeworkValidation.homeworkIdParams }), HomeworkController.deleteHomework);

// the teacher's ticks, marks and comments
router.put(
  "/:homeworkId/checks",
  validateRequest({ params: HomeworkValidation.homeworkIdParams, body: HomeworkValidation.saveChecks }),
  HomeworkController.saveChecks,
);

router.post(
  "/:homeworkId/attachments",
  validateRequest({ params: HomeworkValidation.homeworkIdParams }),
  attachmentUploadMiddleware,
  HomeworkController.addAttachment,
);
router.delete(
  "/:homeworkId/attachments/:attachmentId",
  validateRequest({ params: HomeworkValidation.attachmentParams }),
  HomeworkController.removeAttachment,
);

export const homeworkRoutes = router;

// the family login: GET /family/homework?studentId=
export const familyHomeworkRoute = [validateRequest({ query: HomeworkValidation.familyQuery }), HomeworkController.familyHomework];
