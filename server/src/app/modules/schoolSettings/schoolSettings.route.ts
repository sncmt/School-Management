import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import { superAdminOnly } from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";

/*
 * A school's own settings, for its super admin. For now its look: the accent colour of its
 * dashboard and public homepage. Only the app's tested colours are allowed (they stay readable
 * and never look like the green / red / amber of present, absent and late); null is the default.
 * The colours themselves live in the client (lib/theme/accents.ts): keep the two lists in step.
 */
export const ACCENT_COLORS = ["BLUE", "INDIGO", "VIOLET", "MAROON", "TEAL", "SLATE"] as const;

const updateAppearance = z.strictObject({
  accentColor: z.enum(ACCENT_COLORS, { error: "Choose one of the colours offered" }).nullable(),
});

const router = express.Router();
router.use(authenticate("SCHOOL"), superAdminOnly);

router.get(
  "/appearance",
  catchAsync(async (req: Request, res: Response) => {
    const school = await prisma.school.findUniqueOrThrow({ where: { id: req.auth!.schoolId! }, select: { accentColor: true } });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Appearance retrieved", data: school });
  }),
);

router.patch(
  "/appearance",
  validateRequest({ body: updateAppearance }),
  catchAsync(async (req: Request, res: Response) => {
    const school = await prisma.school.update({
      where: { id: req.auth!.schoolId! },
      data: { accentColor: req.body.accentColor },
      select: { accentColor: true },
    });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Appearance saved", data: school });
  }),
);

export const schoolSettingsRoutes = router;
