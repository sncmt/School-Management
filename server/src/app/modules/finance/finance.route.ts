import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { FinanceController } from "./finance.controller";
import { FinanceValidation } from "./finance.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

// the school's finance rules: who sets up fees sets them
router.get("/settings", authorize("fee_structure:view"), FinanceController.getSettings);
router.put(
  "/settings",
  authorize("fee_structure:update"),
  validateRequest({ body: FinanceValidation.saveSettings }),
  FinanceController.saveSettings,
);

// reports
router.get(
  "/reports/collection",
  authorize("finance_report:view"),
  validateRequest({ query: FinanceValidation.collectionReportQuery }),
  FinanceController.getCollectionReport,
);
router.get(
  "/reports/dues",
  authorize("finance_report:view"),
  validateRequest({ query: FinanceValidation.duesReportQuery }),
  FinanceController.getDuesReport,
);

export const financeRoutes = router;
