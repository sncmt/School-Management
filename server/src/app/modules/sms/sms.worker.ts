import type { SmsProvider } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import { sendThrough } from "./sms.provider";
import { outsideQuietHours } from "./sms.service";

/*
 * The sender: every few seconds it takes the SMS whose time has come and sends each through
 * its school's gateway. Several API processes can run it together: a batch is claimed with
 * FOR UPDATE SKIP LOCKED, so no SMS is taken twice. A failed SMS is tried again later (3 tries
 * in all); one left SENDING by a crash goes back to the queue after a while.
 */

const TICK_MS = 15_000;
const BATCH = 50;
const MAX_ATTEMPTS = 3;
// a retry waits this many minutes per try made
const RETRY_MINUTES = 5;
const STUCK_MINUTES = 10;

// event: null for an SMS sent by hand (its retries don't wait for the morning)
type Claimed = { id: string; schoolId: string; phone: string; body: string; attempts: number; event: string | null };

const claimBatch = () =>
  prisma.$queryRaw<Claimed[]>`
    UPDATE "SmsMessage" SET "status" = 'SENDING', "attempts" = "attempts" + 1, "updatedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "SmsMessage"
      WHERE "status" = 'QUEUED' AND "sendAfter" <= now()
      ORDER BY "sendAfter"
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "schoolId", "phone", "body", "attempts", "event"`;

const tick = async () => {
  // a process that died mid-send left these. The gateway may have taken them already, so they
  // go back to the queue only while tries are left; after that they fail rather than repeat
  const stuck = { status: "SENDING" as const, updatedAt: { lt: new Date(Date.now() - STUCK_MINUTES * 60_000) } };
  await prisma.smsMessage.updateMany({
    where: { ...stuck, attempts: { gte: MAX_ATTEMPTS } },
    data: { status: "FAILED", error: "The gateway never confirmed this SMS; not sent again in case it already went" },
  });
  await prisma.smsMessage.updateMany({ where: { ...stuck, attempts: { lt: MAX_ATTEMPTS } }, data: { status: "QUEUED" } });

  const batch = await claimBatch();
  if (batch.length === 0) return;

  // each school's gateway, and whether SMS is still on there
  const schoolIds = [...new Set(batch.map((m) => m.schoolId))];
  const [settings, modules] = await Promise.all([
    prisma.smsSetting.findMany({ where: { schoolId: { in: schoolIds } }, select: { schoolId: true, isActive: true, provider: true, senderId: true } }),
    prisma.schoolModule.findMany({
      where: { schoolId: { in: schoolIds }, isEnabled: true, module: { code: "sms", isActive: true } },
      select: { schoolId: true },
    }),
  ]);
  const settingOf = new Map(settings.map((s) => [s.schoolId, s]));
  const withModule = new Set(modules.map((m) => m.schoolId));

  for (const sms of batch) {
    const setting = settingOf.get(sms.schoolId);
    if (!setting?.isActive || !withModule.has(sms.schoolId)) {
      await prisma.smsMessage.update({ where: { id: sms.id }, data: { status: "CANCELLED", error: "SMS was turned off before it was sent" } });
      continue;
    }
    await deliver(sms, setting.provider, setting.senderId);
  }
};

const deliver = async (sms: Claimed, provider: SmsProvider, senderId: string | null) => {
  try {
    const { providerRef } = await sendThrough(provider, { phone: sms.phone, body: sms.body, senderId });
    await prisma.smsMessage.update({
      where: { id: sms.id },
      data: { status: "SENT", provider, providerRef, sentAt: new Date(), error: null },
    });
  } catch (error) {
    const message = (error as Error).message.slice(0, 500);
    const giveUp = sms.attempts >= MAX_ATTEMPTS;
    const retryAt = new Date(Date.now() + sms.attempts * RETRY_MINUTES * 60_000);
    await prisma.smsMessage.update({
      where: { id: sms.id },
      data: giveUp
        ? { status: "FAILED", provider, error: message }
        : // an automatic SMS keeps out of the quiet hours on a retry too; one sent by hand goes when it can
          { status: "QUEUED", provider, error: message, sendAfter: sms.event ? outsideQuietHours(retryAt) : retryAt },
    });
  }
};

let running = false;
const run = () => {
  // one tick at a time: a slow database must not pile them up
  if (running) return;
  running = true;
  void tick()
    .catch((error) => console.error("[sms] sending failed:", (error as Error).message))
    .finally(() => {
      running = false;
    });
};

/** Starts the sender; the returned function stops it (on shutdown). */
export const startSmsWorker = () => {
  const timer = setInterval(run, TICK_MS);
  timer.unref();
  return () => clearInterval(timer);
};
