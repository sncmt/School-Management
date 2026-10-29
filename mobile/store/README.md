# Releasing SNCMT on Google Play

Package name: `com.sncmt.app` (permanent once published).

## 1. The upload key (once, keep it safe)

Google Play only accepts apps signed with your own key. Create it once, outside the repo:

```powershell
mkdir C:\keys
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v `
  -keystore C:\keys\sncmt-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

It asks for a password and your name/organisation. Then create `mobile/android/key.properties`
(git ignores it):

```
storeFile=C:/keys/sncmt-upload.jks
storePassword=the password you chose
keyAlias=upload
keyPassword=the password you chose
```

Back up `sncmt-upload.jks` and the password (a password manager, a USB drive). With Play App
Signing (the default) Google keeps the real signing key; if this upload key is lost, Play
support can reset it, but it takes days.

## 2. Each release

1. Raise the version in `mobile/pubspec.yaml`: `version: 1.0.1+2`. The number after `+` must
   go up on every upload; the part before it is what users see.
2. Build the bundle (no `API_ORIGIN`: a release talks to `https://<code>.sncmt.com`):

   ```powershell
   cd mobile
   flutter build appbundle --release
   ```

   The file: `mobile/build/app/outputs/bundle/release/app-release.aab`.
3. Upload it in Play Console (Testing > Internal testing first).

Before the first release, the live server must answer on `https://<code>.sncmt.com/api/v1`
(the website's own address: its Next.js server already forwards `/api/v1`), with the
mobile login (Phase 1) deployed and `FIREBASE_SERVICE_ACCOUNT_PATH` set for push.

## 3. Play Console, the first time

- Developer account: play.google.com/console, a one-time US$25 fee, identity check.
- Create app: name "SNCMT", default language Bangla (bn-BD) or English, App, Free.
- **Privacy policy URL** (required: the app shows names, phone numbers, photos, marks and
  payments). Put a page on the website, e.g. `https://sncmt.com/privacy`.
- **Data safety**: personal info (name, phone number), photos (homework attachments the
  teacher adds), app activity is not collected for ads; data is encrypted in transit
  (HTTPS); users can't create accounts in the app (the school does); deletion: through the
  school.
- **Target audience**: 18+ (guardians and teachers). Students use their guardian's login.
- **Content rating** questionnaire: education, no objectionable content.
- **Store listing**: the texts below, `play-icon-512.png`, `play-feature-graphic.png`, and at
  least 2 phone screenshots (take them on the phone: guardian home, child page, results).
- **Internal testing**: add testers' Gmail addresses, upload the `.aab`, share the opt-in link.
  Then closed testing (new personal accounts need 12 testers for 14 days before production).

Icons: `node mobile/store/make-icons.mjs` (from the repo root) redraws the PNGs; the adaptive
icon and the notification icon are vectors in `android/app/src/main/res`.

## 4. Store listing texts

**App name:** SNCMT

**Short description (80 characters max)**

- English: Your school in your pocket: attendance, homework, results, fees and notices.
- বাংলা: আপনার স্কুল হাতের মুঠোয়: উপস্থিতি, বাড়ির কাজ, ফলাফল, ফি ও নোটিশ।

**Full description**

English:

> SNCMT is the mobile app of schools that use the SNCMT school management system.
>
> For guardians and students:
> - Today's attendance and a monthly attendance calendar
> - Homework with the teacher's instructions, files and checking
> - School notices
> - Exam results with the full marksheet, and admit cards
> - Class routine
> - Fees due, payment history and money receipts
> - Notifications for absence, payments, results and more
>
> For teachers:
> - Today's classes and the weekly routine
> - Taking attendance
> - Giving homework (with photos) and checking it
> - Entering exam marks
>
> Enter your school's code (abc for abc.sncmt.com) and log in with the mobile number your
> school registered. Available in Bangla and English.

বাংলা:

> SNCMT হলো SNCMT স্কুল ম্যানেজমেন্ট সিস্টেম ব্যবহারকারী স্কুলগুলোর মোবাইল অ্যাপ।
>
> অভিভাবক ও শিক্ষার্থীদের জন্য:
> - আজকের উপস্থিতি ও মাসিক উপস্থিতি ক্যালেন্ডার
> - শিক্ষকের নির্দেশনা, ফাইল ও মূল্যায়নসহ বাড়ির কাজ
> - স্কুলের নোটিশ
> - পূর্ণ নম্বরপত্রসহ পরীক্ষার ফলাফল ও প্রবেশপত্র
> - ক্লাস রুটিন
> - বকেয়া ফি, পরিশোধের ইতিহাস ও মানি রসিদ
> - অনুপস্থিতি, পরিশোধ, ফলাফলসহ নানা বিষয়ে নোটিফিকেশন
>
> শিক্ষকদের জন্য:
> - আজকের ক্লাস ও সাপ্তাহিক রুটিন
> - হাজিরা নেওয়া
> - ছবিসহ বাড়ির কাজ দেওয়া ও মূল্যায়ন
> - পরীক্ষার নম্বর দেওয়া
>
> আপনার স্কুলের কোড দিন (abc.sncmt.com হলে abc) এবং স্কুলে নিবন্ধিত মোবাইল নম্বর দিয়ে লগইন
> করুন। বাংলা ও ইংরেজিতে ব্যবহার করা যায়।
