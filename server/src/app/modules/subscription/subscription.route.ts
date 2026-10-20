import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import { superAdminOnly } from "../../middlewares/authorize";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionValidation } from "./subscription.validation";

// The platform admin: every school's plan and the payments they record by hand.
const platform = express.Router();
platform.use(authenticate("PLATFORM"));

platform.get("/", validateRequest({ query: SubscriptionValidation.listQuery }), SubscriptionController.listSchools);
platform.delete("/payments/:paymentId", validateRequest({ params: SubscriptionValidation.paymentIdParams }), SubscriptionController.removePayment);
platform.get("/:schoolId", validateRequest({ params: SubscriptionValidation.schoolIdParams }), SubscriptionController.getSchool);
platform.patch(
  "/:schoolId/plan",
  validateRequest({ params: SubscriptionValidation.schoolIdParams, body: SubscriptionValidation.setPlan }),
  SubscriptionController.setPlan,
);
platform.post(
  "/:schoolId/payments",
  validateRequest({ params: SubscriptionValidation.schoolIdParams, body: SubscriptionValidation.paymentInput }),
  SubscriptionController.addPayment,
);

// The school's super admin: their own subscription, to read.
const school = express.Router();
school.use(authenticate("SCHOOL"));
school.get("/", superAdminOnly, SubscriptionController.mine);

export const platformSubscriptionRoutes = platform;
export const schoolSubscriptionRoutes = school;
