import { Redis } from "ioredis";
import config from "./index";

/*
 * One shared connection for the whole server.
 *
 * Commands fail fast while Redis is down (no offline queue, one retry) instead
 * of hanging the request; callers like the rate limiters fall back to memory.
 * The client keeps reconnecting in the background.
 */
export const redis = new Redis(config.redisUrl, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt) => Math.min(attempt * 500, 10_000),
});

// a down Redis emits an error on every reconnect attempt; log at most once a minute
let lastErrorLoggedAt = 0;
// npm run dev starts Redis and the API together: the first attempts can come before Redis is up
const quietUntil = Date.now() + 10_000;

redis.on("error", (error) => {
  const now = Date.now();
  if (now < quietUntil || now - lastErrorLoggedAt < 60_000) return;
  lastErrorLoggedAt = now;
  console.error(`Redis unavailable (${error.message}). Rate limits fall back to memory.`);
});
