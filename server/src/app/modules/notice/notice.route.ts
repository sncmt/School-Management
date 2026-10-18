import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { SchoolValidation } from "../school/school.validation";
import { NoticeController } from "./notice.controller";
import { attachmentUploadMiddleware } from "../../shared/attachmentUpload";
import { NoticeValidation } from "./notice.validation";

const router = express.Router();

// Public: the school's notice page (no login). Must stay above the login gate below.
router.get(
  "/public/:subdomain",
  validateRequest({ params: SchoolValidation.publicSiteParamsSchema, query: NoticeValidation.boardQuery }),
  NoticeController.listPublic,
);
router.get(
  "/public/:subdomain/:noticeId",
  validateRequest({ params: SchoolValidation.publicSiteParamsSchema.extend(NoticeValidation.noticeIdParams.shape) }),
  NoticeController.getPublic,
);

router.use(authenticate("SCHOOL"));

// any member of the school: the notices meant for them
router.get("/board", validateRequest({ query: NoticeValidation.boardQuery }), NoticeController.getBoard);
router.post("/:noticeId/read", validateRequest({ params: NoticeValidation.noticeIdParams }), NoticeController.markRead);

router.get("/", authorize("notice:view"), validateRequest({ query: NoticeValidation.listQuery }), NoticeController.listNotices);

router.post("/", authorize("notice:create"), validateRequest({ body: NoticeValidation.createNotice }), NoticeController.createNotice);

router.get("/:noticeId", authorize("notice:view"), validateRequest({ params: NoticeValidation.noticeIdParams }), NoticeController.getNotice);

// a published notice also needs notice:publish (checked in the service)
router.patch(
  "/:noticeId",
  authorize("notice:create"),
  validateRequest({ params: NoticeValidation.noticeIdParams, body: NoticeValidation.updateNotice }),
  NoticeController.updateNotice,
);

router.post(
  "/:noticeId/publish",
  authorize("notice:publish"),
  validateRequest({ params: NoticeValidation.noticeIdParams, body: NoticeValidation.publishNotice }),
  NoticeController.publishNotice,
);

router.post(
  "/:noticeId/unpublish",
  authorize("notice:publish"),
  validateRequest({ params: NoticeValidation.noticeIdParams }),
  NoticeController.unpublishNotice,
);

// notice:publish deletes any notice; a writer only their own drafts (checked in the service)
router.delete("/:noticeId", authorize("notice:create"), validateRequest({ params: NoticeValidation.noticeIdParams }), NoticeController.deleteNotice);

router.post(
  "/:noticeId/attachments",
  authorize("notice:create"),
  validateRequest({ params: NoticeValidation.noticeIdParams }),
  attachmentUploadMiddleware,
  NoticeController.addAttachment,
);

router.delete(
  "/:noticeId/attachments/:attachmentId",
  authorize("notice:create"),
  validateRequest({ params: NoticeValidation.attachmentParams }),
  NoticeController.removeAttachment,
);

export const noticeRoutes = router;
