import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import { loginFailureLimit, loginIpLimit, refreshIpLimit } from "../../middlewares/rateLimit";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = express.Router();

// Login: an IP flood limit before validation, then failed-attempt limits per
// account and per IP once the email/phone is normalised.

// Platform
router.post(
  "/platform/login",
  loginIpLimit,
  validateRequest({ body: AuthValidation.platformLoginSchema }),
  loginFailureLimit("PLATFORM"),
  AuthController.platformLogin,
);
router.post("/platform/refresh", refreshIpLimit, AuthController.refreshPlatformAccessToken);
router.post("/platform/logout", AuthController.platformLogout);

// School
router.post(
  "/school/login",
  loginIpLimit,
  validateRequest({ body: AuthValidation.schoolLoginSchema }),
  loginFailureLimit("SCHOOL"),
  AuthController.schoolLogin,
);
router.post("/school/refresh", refreshIpLimit, AuthController.refreshSchoolAccessToken);
router.post("/school/logout", AuthController.schoolLogout);

// any logged-in session, platform or school
const anySession = authenticate();

router.get("/me", anySession, AuthController.getMe);
router.post(
  "/change-password",
  anySession,
  validateRequest({ body: AuthValidation.changePasswordSchema }),
  AuthController.changePassword,
);
router.post("/logout-all", anySession, AuthController.logoutAllSessions);

// The school super admin changes anyone's password in the school (their own too),
// confirmed with a code emailed to them. Real members only: never a platform admin.
const schoolMember = authenticate("SCHOOL", { memberOnly: true });

router.post(
  "/school/password-code",
  schoolMember,
  validateRequest({ body: AuthValidation.passwordCodeSchema }),
  AuthController.sendPasswordCode,
);
router.post(
  "/school/users/:userId/password",
  schoolMember,
  validateRequest({ params: AuthValidation.userIdParams, body: AuthValidation.setUserPasswordSchema }),
  AuthController.setUserPassword,
);

export const authRoutes = router;