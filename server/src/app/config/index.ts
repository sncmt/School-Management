import dotenv from "dotenv";
import path from "path";
import type {StringValue} from 'ms'

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  salt_round: process.env.SALT_ROUND || 10,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  schoolMonthlyFee: process.env.DEFAULT_MONTHLY_FEE,
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  // Cloudflare R2 (S3-compatible) file storage; uploads are refused until all four are set
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
  },
  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET,
    access_expire: process.env.JWT_ACCESS_EXPIRE_IN,

    refresh_secret: process.env.JWT_REFRESH_SECRET,
    refresh_expire: process.env.JWT_REFRESH_EXPIRE_IN as StringValue,
  },
  reset_pass_link: process.env.RESET_PASS_LINK,
  // outgoing email (SMTP), e.g. Gmail: smtp.gmail.com, port 465, the address and an app password
  mail: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    // the sender shown to the reader; defaults to SMTP_USER
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
  },
  // where the marketing site's contact form is sent: CONTACT_EMAIL, else the platform admin's address
  contactEmail: process.env.CONTACT_EMAIL || process.env.PLATFORM_ADMIN_EMAIL,
  // a school's own web address, for links others follow back to it (SSLCommerz returns the
  // payer there): "{subdomain}" is replaced, e.g. https://{subdomain}.sncmt.com
  publicSchoolUrl: process.env.PUBLIC_SCHOOL_URL || "http://{subdomain}.localhost:3000",
  // where attendance devices send their punches (the "cloud server" set on the device):
  // shown to schools on the Devices page; empty until the server is deployed
  deviceServer: {
    host: process.env.DEVICE_SERVER_HOST || null,
    port: Number(process.env.DEVICE_SERVER_PORT) || null,
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
};
