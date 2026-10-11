import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { AcademicYearController } from "./academicYear.controller";
import { AcademicYearValidation } from "./academicYear.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

router.post(
  "/create",
  authorize("academic_year:create"),
  validateRequest({ body: AcademicYearValidation.createAcademicYear }),
  AcademicYearController.createAcademicYear,
);

router.get("/", authorize("academic_year:view"), AcademicYearController.getAcademicYears);

router.get(
  "/:academicYearId",
  authorize("academic_year:view"),
  validateRequest({ params: AcademicYearValidation.academicYearIdParams }),
  AcademicYearController.getAcademicYearById,
);

router.patch(
  "/:academicYearId",
  authorize("academic_year:update"),
  validateRequest({
    params: AcademicYearValidation.academicYearIdParams,
    body: AcademicYearValidation.updateAcademicYear,
  }),
  AcademicYearController.updateAcademicYear,
);

// makes this the school's current year (only one at a time)
router.patch(
  "/:academicYearId/current",
  authorize("academic_year:update"),
  validateRequest({ params: AcademicYearValidation.academicYearIdParams }),
  AcademicYearController.setCurrentAcademicYear,
);

export const academicYearRoute = router;
