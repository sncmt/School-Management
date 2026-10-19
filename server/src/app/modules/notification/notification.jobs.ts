import { todayInBangladesh } from "../../shared/scheduleSchemas";
import { NotificationService } from "./notification.service";

/*
 * Messages nobody's action triggers, run inside the API process: once a month, from the
 * REMINDER_DAY (Bangladesh time), families are reminded of fees owed.
 *
 * It looks every hour and runs at most once a month per process. Every message has a monthly
 * dedupeKey, so a restart or a second server running it again sends nothing twice.
 */

// the day of the month the fee reminder goes out (or the first day after, if the server was off)
const REMINDER_DAY = 10;
const CHECK_EVERY_MS = 60 * 60 * 1000;
// first look shortly after start, not during it
const FIRST_CHECK_MS = 60 * 1000;

let lastReminderMonth: string | null = null;

const check = async () => {
  const today = todayInBangladesh();
  const month = today.toISOString().slice(0, 7);
  if (today.getUTCDate() < REMINDER_DAY || lastReminderMonth === month) return;

  const sent = await NotificationService.sendFeeDueReminders();
  lastReminderMonth = month;
  console.log(`[notification] fee reminders for ${month}: ${sent} student(s) owe fees`);
};

const run = () => void check().catch((error) => console.error("[notification] fee reminders failed:", (error as Error).message));

/** Starts the jobs; the returned function stops them (on shutdown). */
export const startNotificationJobs = () => {
  const first = setTimeout(run, FIRST_CHECK_MS);
  const every = setInterval(run, CHECK_EVERY_MS);
  // never keep the process alive on their own
  first.unref();
  every.unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
};
