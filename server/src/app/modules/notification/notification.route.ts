import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";
import { NotificationValidation } from "./notification.validation";

const router = express.Router();

// the mobile app stops a phone's push notifications on logout, also after its session has
// ended: the token itself is the proof, so no login is needed
router.post("/devices/remove", validateRequest({ body: NotificationValidation.unregisterDevice }), NotificationController.unregisterDevice);

// every member of the school reads their own inbox: no permission needed
router.use(authenticate("SCHOOL"));

// the mobile app's phone: its pushes follow this login, school and language
router.post("/devices", validateRequest({ body: NotificationValidation.registerDevice }), NotificationController.registerDevice);

router.get("/", validateRequest({ query: NotificationValidation.listQuery }), NotificationController.listMine);
router.get("/unread-count", NotificationController.unreadCount);
router.post("/read-all", NotificationController.markAllRead);

// the school's in-app message switches (changing one needs its permission, checked in the service)
router.get("/settings", NotificationController.getSettings);
router.patch(
  "/settings/:type",
  validateRequest({ params: NotificationValidation.typeParams, body: NotificationValidation.setTypeEnabled }),
  NotificationController.setTypeEnabled,
);
router.post(
  "/:notificationId/read",
  validateRequest({ params: NotificationValidation.notificationIdParams }),
  NotificationController.markRead,
);

export const notificationRoutes = router;
