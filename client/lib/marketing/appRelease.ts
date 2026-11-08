/*
 * Where the mobile app is downloaded until it is on Google Play. The build
 * (.github/workflows/build-android-apk.yml) publishes every APK as a release of the public
 * repo sncmt/sncmt-app, which holds only the app files (the code stays private). The app's
 * own "Update available" check reads the same repo (mobile/lib/core/config.dart).
 */

/** The newest APK, always: GitHub follows "latest" to the last release. */
export const APK_URL = "https://github.com/sncmt/sncmt-app/releases/latest/download/sncmt.apk";

/** Our own short link to it (app/(marketing)/app/download): what schools share and the QR code holds. */
export const APP_DOWNLOAD_PATH = "/app/download";
