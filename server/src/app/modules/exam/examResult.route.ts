import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { ExamResultController } from "./examResult.controller";
import { ExamResultValidation } from "./examResult.validation";
import { ResultCardController } from "./resultCard.controller";
import { ResultCardValidation } from "./resultCard.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

// works out and saves a class's result; marks lock until it is unlocked
router.post(
  "/publish",
  authorize("exam:publish_result"),
  validateRequest({ body: ExamResultValidation.examClass }),
  ExamResultController.publishResult,
);

router.post(
  "/unlock",
  authorize("exam:unlock"),
  validateRequest({ body: ExamResultValidation.examClass }),
  ExamResultController.unlockResult,
);

router.get(
  "/tabulation",
  authorize("exam:view_result"),
  validateRequest({ query: ExamResultValidation.tabulationQuery }),
  ExamResultController.getTabulation,
);

router.get(
  "/marksheet",
  authorize("exam:view_result"),
  validateRequest({ query: ExamResultValidation.marksheetQuery }),
  ExamResultController.getMarksheet,
);

router.get(
  "/summary",
  authorize("exam:view_result"),
  validateRequest({ query: ExamResultValidation.summaryQuery }),
  ExamResultController.getExamSummary,
);

// ------------------------------------------------------------- result cards

// the school's result card design (defaults until it saves one)
router.get("/card-settings", authorize("exam:view_result"), ResultCardController.getSettings);
router.put(
  "/card-settings",
  authorize("grading:manage"),
  validateRequest({ body: ResultCardValidation.saveSettings }),
  ResultCardController.saveSettings,
);

// printable cards: one student, a section or the whole class
router.get(
  "/cards",
  authorize("exam:view_result"),
  validateRequest({ query: ResultCardValidation.cardsQuery }),
  ResultCardController.getCards,
);

// the class teacher's remarks (who may write them is checked in the service)
router.get("/remarks", validateRequest({ query: ResultCardValidation.remarksQuery }), ResultCardController.getRemarks);
router.put("/remarks", validateRequest({ body: ResultCardValidation.saveRemarks }), ResultCardController.saveRemarks);

export const examResultRoutes = router;
