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

// Any logged-in session. These also work while a generated password is still
// waiting to be changed; every other protected route is blocked until it is.
const anySession = authenticate(undefined, { allowPasswordChange: true });

router.get("/me", anySession, AuthController.getMe);
router.post(
  "/change-password",
  anySession,
  validateRequest({ body: AuthValidation.changePasswordSchema }),
  AuthController.changePassword,
);
router.post("/logout-all", anySession, AuthController.logoutAllSessions);

export const authRoutes = router;