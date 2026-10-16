import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { PromotionController } from "./promotion.controller";
import { PromotionValidation } from "./promotion.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

// a class's students this year, with their final result, to decide who moves up
router.get("/", authorize("student:promote"), validateRequest({ query: PromotionValidation.previewQuery }), PromotionController.getPreview);

// move them: up a class, repeat, graduate or leave
router.post("/", authorize("student:promote"), validateRequest({ body: PromotionValidation.promote }), PromotionController.promote);

// take back one student's move (this year's enrollment id)
router.post(
  "/:enrollmentId/undo",
  authorize("student:promote"),
  validateRequest({ params: PromotionValidation.enrollmentIdParams }),
  PromotionController.undo,
);

export const promotionRoutes = router;
