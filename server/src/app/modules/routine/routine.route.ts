import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { RoutineController } from "./routine.controller";
import { RoutineValidation as V } from "./routine.validation";

const router = express.Router();

// ------------------------------------------------------- the teacher's own
// no permission needed, only a real membership (not a platform admin via X-School-Id)

const teacherSelf = authenticate("SCHOOL", { memberOnly: true });

router.get("/me/week", teacherSelf, RoutineController.getMyWeek);
router.get("/me/day", teacherSelf, validateRequest({ query: V.myDayQuery }), RoutineController.getMyDay);

router.use(authenticate("SCHOOL"));

// ------------------------------------------------------------ period templates

router.post("/templates", authorize("routine:manage"), validateRequest({ body: V.templateBody }), RoutineController.createTemplate);
router.get("/templates", authorize("routine:view"), RoutineController.getTemplates);
router.get(
  "/templates/:templateId",
  authorize("routine:view"),
  validateRequest({ params: V.templateIdParams }),
  RoutineController.getTemplateById,
);
router.put(
  "/templates/:templateId",
  authorize("routine:manage"),
  validateRequest({ params: V.templateIdParams, body: V.templateBody }),
  RoutineController.updateTemplate,
);
router.delete(
  "/templates/:templateId",
  authorize("routine:manage"),
  validateRequest({ params: V.templateIdParams }),
  RoutineController.deleteTemplate,
);

// ------------------------------------------------------------- routine entries

router.post("/entries", authorize("routine:manage"), validateRequest({ body: V.entryBody }), RoutineController.createEntry);
router.put(
  "/entries/:entryId",
  authorize("routine:manage"),
  validateRequest({ params: V.entryIdParams, body: V.entryBody }),
  RoutineController.updateEntry,
);
router.delete(
  "/entries/:entryId",
  authorize("routine:manage"),
  validateRequest({ params: V.entryIdParams }),
  RoutineController.deleteEntry,
);

// ---------------------------------------------------------------------- views

router.get("/section", authorize("routine:view"), validateRequest({ query: V.sectionWeekQuery }), RoutineController.getSectionWeek);
router.get("/teacher", authorize("routine:view"), validateRequest({ query: V.teacherWeekQuery }), RoutineController.getTeacherWeek);
router.get("/workload", authorize("routine:view"), validateRequest({ query: V.yearQuery }), RoutineController.getWorkload);
// a section's or a teacher's classes on one date (holidays, schedule changes, substitutes)
router.get("/day", authorize("routine:view"), validateRequest({ query: V.dayQuery }), RoutineController.getDay);

// --------------------------------------------------------------- substitutes

router.get(
  "/free-teachers",
  authorize("routine:manage"),
  validateRequest({ query: V.freeTeachersQuery }),
  RoutineController.getFreeTeachers,
);
router.get(
  "/substitutions",
  authorize("routine:view"),
  validateRequest({ query: V.substitutionsQuery }),
  RoutineController.getSubstitutions,
);
router.post(
  "/substitutions",
  authorize("routine:manage"),
  validateRequest({ body: V.substitutionBody }),
  RoutineController.createSubstitution,
);
router.delete(
  "/substitutions/:substitutionId",
  authorize("routine:manage"),
  validateRequest({ params: V.substitutionIdParams }),
  RoutineController.deleteSubstitution,
);

export const routineRoutes = router;
