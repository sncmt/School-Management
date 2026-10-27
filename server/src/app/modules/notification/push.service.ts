import { cert, initializeApp } from "firebase-admin/app";
import { getMessaging, type Messaging, type TokenMessage } from "firebase-admin/messaging";
import type { NotificationType, SmsEvent, SmsLanguage } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import type { Names } from "../../shared/names";
import { defaultText, type SmsFacts } from "../sms/sms.service";

type Auth = NonNullable<Express.Request["auth"]>;

/*
 * Push notifications to the mobile app (Firebase Cloud Messaging). Every new in-app message
 * is also pushed to the phones logged in to its school, in each phone's language; the text
 * is the automatic SMS's default wording, and the school's name is the title.
 *
 * FIREBASE_SERVICE_ACCOUNT_PATH: the Firebase project's service account key (Firebase
 * console > Project settings > Service accounts > Generate new private key). Without it,
 * nothing is pushed and everything else works as before.
 */

let messaging: Messaging | null | undefined;

const messagingOrNull = () => {
  if (messaging !== undefined) return messaging;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!keyPath) {
    console.warn("[push] FIREBASE_SERVICE_ACCOUNT_PATH is not set: push notifications are off");
    return (messaging = null);
  }
  try {
    messaging = getMessaging(initializeApp({ credential: cert(keyPath) }, "push"));
  } catch (error) {
    console.error("[push] the service account key could not be loaded:", (error as Error).message);
    messaging = null;
  }
  return messaging;
};

// ------------------------------------------------------------------ phones

/* The app's phone for this login: a token already known moves to this user, school and language. */
const register = async (auth: Auth, data: { token: string; language: SmsLanguage; platform: string }) => {
  const fields = { userId: auth.userId, schoolId: auth.schoolId!, language: data.language, platform: data.platform };
  await prisma.deviceToken.upsert({ where: { token: data.token }, create: { token: data.token, ...fields }, update: fields });
  return { registered: true };
};

/* The phone logged out (or its session ended): it gets nothing more. Knowing the token is enough. */
const unregister = async (token: string) => {
  await prisma.deviceToken.deleteMany({ where: { token } });
  return { registered: false };
};

// -------------------------------------------------------------------- send

type PushRow = { id: string; schoolId: string; userId: string; studentId: string | null; type: NotificationType; data: unknown };

/* The SMS event of a message: promotion splits into promoted and graduated, as for SMS. */
const eventOf = (row: PushRow): SmsEvent =>
  row.type === "STUDENT_PROMOTED" && (row.data as { outcome?: string }).outcome === "GRADUATED" ? "STUDENT_GRADUATED" : (row.type as SmsEvent);

const pick = (names: Names | null | undefined, language: SmsLanguage) =>
  (language === "BN" ? names?.nameBn || names?.nameEn : names?.nameEn || names?.nameBn) ?? "";

// Firebase sends at most 500 messages per call
const BATCH = 500;

// tokens Firebase says will never work again: the app was removed, or the token was replaced
const DEAD_TOKEN = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);

/* Pushes in-app messages just written. Runs in the background: failures are logged, never thrown at the action. */
const push = async (rows: PushRow[]) => {
  if (rows.length === 0) return;
  const fcm = messagingOrNull();
  if (!fcm) return;

  const pairs = [...new Map(rows.map((r) => [`${r.userId}:${r.schoolId}`, { userId: r.userId, schoolId: r.schoolId }])).values()];
  const [devices, schools] = await Promise.all([
    prisma.deviceToken.findMany({ where: { OR: pairs }, select: { token: true, userId: true, schoolId: true, language: true } }),
    prisma.school.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.schoolId))] } }, select: { id: true, nameEn: true, nameBn: true } }),
  ]);
  if (devices.length === 0) return;
  const schoolOf = new Map(schools.map((s) => [s.id, s]));

  const messages: TokenMessage[] = rows.flatMap((row) => {
    const data = row.data as SmsFacts & { student?: Names };
    return devices
      .filter((d) => d.userId === row.userId && d.schoolId === row.schoolId)
      .map((d) => ({
        token: d.token,
        notification: {
          title: pick(schoolOf.get(row.schoolId), d.language),
          body: defaultText(eventOf(row), d.language, data.student ?? {}, data),
        },
        // what the app opens when the notification is tapped
        data: { notificationId: row.id, type: row.type, studentId: row.studentId ?? "" },
        android: { priority: "high" as const },
      }));
  });

  const dead = new Set<string>();
  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const result = await fcm.sendEach(batch);
    result.responses.forEach((r, j) => {
      if (!r.success && r.error && DEAD_TOKEN.has(r.error.code)) dead.add(batch[j].token);
    });
  }
  if (dead.size > 0) await prisma.deviceToken.deleteMany({ where: { token: { in: [...dead] } } });
};

export const PushService = { register, unregister, push };
