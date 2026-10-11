import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { ClassController } from "./class.controller";
import { ClassValidation } from "./class.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

router.post(
  "/create",
  authorize("class:create"),
  validateRequest({ body: ClassValidation.createClass }),
  ClassController.createClass,
);

router.get(
  "/",
  authorize("class:view"),
  validateRequest({ query: ClassValidation.classQuery }),
  ClassController.getClasses,
);

router.get(
  "/:classId",
  authorize("class:view"),
  validateRequest({ params: ClassValidation.classIdParams }),
  ClassController.getClassById,
);

router.patch(
  "/:classId",
  authorize("class:update"),
  validateRequest({ params: ClassValidation.classIdParams, body: ClassValidation.updateClass }),
  ClassController.updateClass,
);

router.delete(
  "/:classId",
  authorize("class:delete"),
  validateRequest({ params: ClassValidation.classIdParams }),
  ClassController.deleteClass,
);

export const classRoutes = router;
