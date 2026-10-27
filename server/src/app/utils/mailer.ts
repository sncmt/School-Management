import httpStatus from "http-status";
import nodemailer, { type Transporter } from "nodemailer";
import config from "../config";
import { AppError } from "../errorHandler/AppError";

/*
 * Outgoing email over SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM).
 * In development without SMTP settings the message is printed to the server console
 * instead, so the flows can be tried without a mail account; in production it is refused.
 */

const { host, port, user, pass, from } = config.mail;
const configured = Boolean(host && user && pass);

let transporter: Transporter | null = null;
const getTransporter = () =>
  (transporter ??= nodemailer.createTransport({
    host,
    port,
    // 465 is SMTP over TLS; 587 and 25 upgrade with STARTTLS
    secure: port === 465,
    auth: { user, pass },
  }));

type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string };

const send = async (mail: Mail) => {
  if (!configured) {
    if (config.env === "production") {
      throw new AppError("Email is not set up on the server yet", httpStatus.SERVICE_UNAVAILABLE);
    }
    console.warn(`[mail] SMTP is not set up; the email to ${mail.to} would say:\n${mail.subject}\n${mail.text}`);
    return;
  }
  try {
    await getTransporter().sendMail({ from, ...mail });
  } catch (error) {
    console.error("[mail] sending failed:", (error as Error).message);
    throw new AppError("The email could not be sent. Try again in a moment", httpStatus.BAD_GATEWAY);
  }
};

export const Mailer = { send };
