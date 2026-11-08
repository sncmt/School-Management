import { APK_URL } from "@/lib/marketing/appRelease";

/*
 * sncmt.com/app/download: straight to the newest APK. Schools can share this link (an SMS, a
 * printed QR code) and it keeps working for every new version. A temporary redirect, so a
 * browser never remembers an old target.
 */
export function GET() {
  return Response.redirect(APK_URL, 302);
}
