import express, { type NextFunction, type Request, type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import { AppError } from "../../errorHandler/AppError";
import authenticate from "../../middlewares/auth";
import authorize, { checkPermission } from "../../middlewares/authorize";
import { SmsController } from "./sms.controller";
import { activityPermission, SMS_ACTIVITIES } from "./sms.templates";
import { SmsValidation } from "./sms.validation";

const router = express.Router();

const ACTIVITY_PERMISSIONS = SMS_ACTIVITIES.map(activityPermission);
const ALL_PERMISSIONS = [...ACTIVITY_PERMISSIONS, "sms:templates", "sms:send", "sms:log", "sms:gateway"];

/* Needs any one of the permissions (the SMS page shows each part to those who may use it). */
const authorizeAny = (codes: string[]) => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const results = await Promise.all(codes.map((code) => checkPermission(req.auth!, code)));
    if (results.includes("OK")) return next();
    if (results.every((r) => r === "MODULE_DISABLED")) throw new AppError("This feature is not enabled for your school", httpStatus.FORBIDDEN);
    throw new AppError("You do not have permission to perform this action", httpStatus.FORBIDDEN);
  } catch (error) {
    next(error);
  }
};

router.use(authenticate("SCHOOL"));

// the gateway, sender ID, language and the switch for all SMS
router.get("/settings", authorizeAny(ALL_PERMISSIONS), SmsController.getSettings);
router.patch("/settings", authorize("sms:gateway"), validateRequest({ body: SmsValidation.updateSettings }), SmsController.updateSettings);

// the automatic SMS; on/off needs the event's activity permission, the wording sms:templates (checked in the service)
router.get("/templates", authorizeAny([...ACTIVITY_PERMISSIONS, "sms:templates"]), SmsController.listTemplates);
router.patch(
  "/templates/:event",
  authorizeAny([...ACTIVITY_PERMISSIONS, "sms:templates"]),
  validateRequest({ params: SmsValidation.eventParams, body: SmsValidation.updateTemplate }),
  SmsController.updateTemplate,
);

// every SMS: automatic and by hand
router.get("/messages", authorize("sms:log"), validateRequest({ query: SmsValidation.logQuery }), SmsController.listMessages);

// by hand, to the guardians of the school, a class or a section
router.get("/recipients", authorize("sms:send"), validateRequest({ query: SmsValidation.recipientsQuery }), SmsController.previewRecipients);
router.post("/send", authorize("sms:send"), validateRequest({ body: SmsValidation.sendSms }), SmsController.sendByHand);

export const smsRoutes = router;
