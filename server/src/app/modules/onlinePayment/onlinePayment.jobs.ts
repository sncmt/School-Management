import { prisma } from "../../../../lib/prisma";
import { settle } from "./checkout.service";

/*
 * Online payments left waiting (the payer closed the page, SSLCommerz's IPN never reached us):
 * every 5 minutes each is asked about at SSLCommerz, once it is 10 minutes old; one still not
 * paid after 2 days is given up as failed (SSLCommerz's payment page has long expired by then).
 */

const EVERY_MS = 5 * 60_000;
const FIRST_MS = 60_000;
const SETTLE_AFTER_MS = 10 * 60_000;
const GIVE_UP_AFTER_MS = 2 * 24 * 60 * 60_000;
// at most this many a run (the rest wait for the next)
const BATCH = 50;

let busy = false;
// one run (also called by tests)
export const settleWaiting = async () => {
  if (busy) return;
  busy = true;
  try {
    const now = Date.now();
    const waiting = await prisma.onlinePayment.findMany({
      where: { status: "PENDING", createdAt: { lte: new Date(now - SETTLE_AFTER_MS) } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: BATCH,
    });
    for (const p of waiting) {
      let status: string | null = "PENDING";
      try {
        status = await settle(p.id);
      } catch (error) {
        // SSLCommerz unreachable: try again next run, never give up on a failed call
        console.error("[online payment] check failed:", (error as Error).message);
        continue;
      }
      if (status === "PENDING" && now - p.createdAt.getTime() > GIVE_UP_AFTER_MS) {
        await prisma.onlinePayment.updateMany({
          where: { id: p.id, status: "PENDING" },
          data: { status: "FAILED", failReason: "SSLCommerz never confirmed this payment" },
        });
      }
    }
  } catch (error) {
    console.error("[online payment] background run failed:", (error as Error).message);
  } finally {
    busy = false;
  }
};

/** Starts the job; the returned function stops it (on shutdown). */
export const startOnlinePaymentJobs = () => {
  const first = setTimeout(settleWaiting, FIRST_MS);
  const every = setInterval(settleWaiting, EVERY_MS);
  first.unref();
  every.unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
};
