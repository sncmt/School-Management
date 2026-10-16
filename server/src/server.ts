import app from "./app";
import config from "./app/config";
import { redis } from "./app/config/redis";
import { prisma } from "../lib/prisma";

const port = Number(config.port ?? 5000);

const server = app.listen(port);

let stopping = false;

/*
 * SIGTERM (docker stop, a restart): stop taking requests, let the ones in flight
 * finish (10 s at most), then close the database pool and Redis.
 * SIGINT (Ctrl+C in a terminal): the same but at once; a second Ctrl+C quits on the spot.
 */
const shutdown = (signal: "SIGTERM" | "SIGINT") => {
  if (stopping) process.exit(1);
  stopping = true;

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
