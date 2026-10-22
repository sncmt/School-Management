import { runAllAbsentMarks } from "./absent.service";
import { processAllWaiting } from "./processor.service";

/*
 * The attendance devices' background work, inside the API process: every minute, punches
 * still waiting are turned into attendance (normally they are, right after the upload; this
 * catches anything missed), then each school's absent cutoff is checked.
 */

const EVERY_MS = 60_000;
// first run shortly after start, not during it
const FIRST_MS = 30_000;

let busy = false;
const run = async () => {
  if (busy) return;
  busy = true;
  try {
    await processAllWaiting();
    await runAllAbsentMarks();
  } catch (error) {
    console.error("[devices] background run failed:", (error as Error).message);
  } finally {
    busy = false;
  }
};

/** Starts the jobs; the returned function stops them (on shutdown). */
export const startDeviceJobs = () => {
  const first = setTimeout(run, FIRST_MS);
  const every = setInterval(run, EVERY_MS);
  // never keep the process alive on their own
  first.unref();
  every.unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
};
