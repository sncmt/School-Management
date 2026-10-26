# SNCMT mobile app

The Android app for guardians/students and teachers (Flutter). School staff and the
school's super admin use the website.

The user enters their school's code (`abc` for abc.sncmt.com) and logs in with their
mobile number. The app talks to `https://<code>.sncmt.com/api/v1` with the server's
mobile login (`X-Client: mobile`, `Authorization: Bearer`).

## Run against the local API

1. Start the API: `npm run dev` in `server/`.
2. Plug in the phone (USB debugging on), then forward its port 5000 to this PC:

   ```
   adb reverse tcp:5000 tcp:5000
   ```

   Run this again whenever the phone reconnects, including after each install: without
   it the app says "Can't reach the server".
3. Run:

   ```
   flutter run --dart-define=API_ORIGIN=http://localhost:5000
   ```

   With `API_ORIGIN` set, the app calls Express directly and sends the school as the
   Host header (`<code>.localhost`). Plain http is allowed in debug builds only.

## Notes

- Text is in `lib/l10n/app_en.arb` and `app_bn.arb`; `flutter gen-l10n` (or any build)
  regenerates `app_localizations*.dart`.
- Firebase: project `sncmt-992e5`, configured with `flutterfire configure`
  (`lib/firebase_options.dart`, `android/app/google-services.json`).
- `android/gradle.properties` keeps Gradle small (2 GB) for a 6 GB PC and turns off
  Kotlin incremental compilation, which breaks when the project and the pub cache are on
  different drives.
