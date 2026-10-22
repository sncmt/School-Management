import app from "./app";
import config from "./app/config";
import { redis } from "./app/config/redis";
import { prisma } from "../lib/prisma";
import { startNotificationJobs } from "./app/modules/notification/notification.jobs";
import { startSmsWorker } from "./app/modules/sms/sms.worker";
import { startDeviceJobs } from "./app/modules/attendanceDevice/device.jobs";
import { startOnlinePaymentJobs } from "./app/modules/onlinePayment/onlinePayment.jobs";

const port = Number(config.port ?? 5000);

const server = app.listen(port);

// the monthly fee reminder, the SMS sender, the attendance devices' punches and absent marks,
// and online payments left waiting
const stopNotificationJobs = startNotificationJobs();
const stopSmsWorker = startSmsWorker();
const stopDeviceJobs = startDeviceJobs();
const stopOnlinePaymentJobs = startOnlinePaymentJobs();
const stopJobs = () => {
  stopNotificationJobs();
  stopSmsWorker();
  stopDeviceJobs();
  stopOnlinePaymentJobs();
};

let stopping = false;

/*
 * SIGTERM (docker stop, a restart): stop taking requests, let the ones in flight
 * finish (10 s at most), then close the database pool and Redis.
 * SIGINT (Ctrl+C in a terminal): the same but at once; a second Ctrl+C quits on the spot.
 */
const shutdown = (signal: "SIGTERM" | "SIGINT") => {
  if (stopping) process.exit(1);
  stopping = true;
  stopJobs();

  const finish = async () => {
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };
  server.close(() => void finish());
  // idle keep-alive connections would otherwise hold the server open
  server.closeIdleConnections();
  if (signal === "SIGINT") server.closeAllConnections();

  setTimeout(() => process.exit(1), signal === "SIGTERM" ? 10_000 : 2_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
