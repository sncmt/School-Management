import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import { z } from "zod";
import config from "../../config";
import { AppError } from "../../errorHandler/AppError";
import validateRequest from "../../errorHandler/validateRequest";
import { contactIpLimit } from "../../middlewares/rateLimit";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { bdPhoneSchema, emailSchema } from "../../utils/identity";
import { Mailer } from "../../utils/mailer";

/*
 * The marketing site's contact form: a school asking about the platform. Nothing is stored;
 * the message is emailed to the platform (config.contactEmail) with the sender as reply-to.
 */

const PACKAGES = ["BASIC", "STANDARD", "PREMIUM"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const contactSchema = z.object({
  name: z.string({ error: "Name is required!" }).trim().min(2, "Enter your name").max(100),
  school: z.string({ error: "School name is required!" }).trim().min(2, "Enter your school's name").max(150),
  phone: bdPhoneSchema,
  email: optionalText(150).pipe(emailSchema.optional()),
  package: z.enum(PACKAGES).optional(),
  billing: z.enum(["MONTHLY", "YEARLY"]).optional(),
  message: optionalText(1000),
  // a field people never see: only bots fill it in
  website: optionalText(200),
});

type ContactMessage = z.infer<typeof contactSchema>;

const describePackage = ({ package: pkg, billing }: ContactMessage) =>
  pkg ? `${pkg.charAt(0)}${pkg.slice(1).toLowerCase()}${billing ? ` (${billing.toLowerCase()})` : ""}` : "Not chosen";

const router = express.Router();

router.post(
  "/",
  contactIpLimit,
  validateRequest({ body: contactSchema }),
  catchAsync(async (req: Request, res: Response) => {
    const body = req.body as ContactMessage;

    // a bot: answer as if sent, send nothing
    if (!body.website) {
      if (!config.contactEmail) {
        throw new AppError("The contact form is not set up yet", httpStatus.SERVICE_UNAVAILABLE);
      }
      await Mailer.send({
        to: config.contactEmail,
        replyTo: body.email,
        subject: `New enquiry: ${body.school}`,
        text: [
          `Name: ${body.name}`,
          `School: ${body.school}`,
          `Phone: ${body.phone}`,
          `Email: ${body.email ?? "-"}`,
          `Package: ${describePackage(body)}`,
          "",
          body.message ?? "(no message)",
        ].join("\n"),
      });
    }

    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Message sent", data: null });
  }),
);

export const contactRoutes = router;
