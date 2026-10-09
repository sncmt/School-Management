import validateRequest from "./../../errorHandler/validateRequest";
import express from "express";
import { SchoolController } from "./school.controller";
import { SchoolValidation } from "./school.validation";
import authenticate from "../../middlewares/auth";

const router = express.Router();

// Public: a school's name, logo and language for its own site (login page,
// default language). Must stay above the platform-only gate below.
router.get(
  "/site/:subdomain",
  validateRequest({ params: SchoolValidation.publicSiteParamsSchema }),
  SchoolController.getPublicSite,
);

// every other school route is for the platform admin only
router.use(authenticate("PLATFORM"));

router.post(
  "/create",
  validateRequest({ body: SchoolValidation.createSchoolSchema }),
  SchoolController.createSchool,
);
router.patch(
  "/:schoolId/activate",
  validateRequest({ params: SchoolValidation.activateSchoolSchema }),
  SchoolController.activateSchool,
);
router.get(
  "/get_all",
  validateRequest({ query: SchoolValidation.getAllSchoolsQuerySchema }),
  SchoolController.getAllSchools,
);

// one school (keep below the fixed paths above)
router.get(
  "/:schoolId",
  validateRequest({ params: SchoolValidation.schoolIdParamsSchema }),
  SchoolController.getSchoolById,
);
router.patch(
  "/:schoolId",
  validateRequest({
    params: SchoolValidation.schoolIdParamsSchema,
    body: SchoolValidation.updateSchoolSchema,
  }),
  SchoolController.updateSchool,
);
router.patch(
  "/:schoolId/status",
  validateRequest({
    params: SchoolValidation.schoolIdParamsSchema,
    body: SchoolValidation.changeSchoolStatusSchema,
  }),
  SchoolController.changeSchoolStatus,
);
router.post(
  "/:schoolId/super-admin/reset-password",
  validateRequest({ params: SchoolValidation.schoolIdParamsSchema }),
  SchoolController.resetSuperAdminPassword,
);

export const schoolRoutes = router;
