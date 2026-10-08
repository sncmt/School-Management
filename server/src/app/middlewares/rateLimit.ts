import { createHash } from "crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "../config/redis";
import { AppError } from "../errorHandler/AppError";
import { DomainUtils } from "../utils/domain";

/*
 * Rate limits for the auth endpoints, stored in Redis so they hold across
 * restarts and server instances. While Redis is unreachable each limiter falls
 * back to a per-process memory limiter, so limits still apply.
 *
 * Limits per IP are generous on purpose: a whole school (or a mobile carrier)
 * often shares one public IP.
 */

type Rule = { keyPrefix: string; points: number; duration: number; blockDuration?: number };

const createLimiter = (rule: Rule) =>
  new RateLimiterRedis({
    storeClient: redis,
    ...rule,
    keyPrefix: `rl:${rule.keyPrefix}`,
    insuranceLimiter: new RateLimiterMemory({ ...rule, keyPrefix: `rl-mem:${rule.keyPrefix}` }),
  });

const MINUTE = 60;

const limiters = {
  // every login request from one IP, valid or not
  loginIp: createLimiter({ keyPrefix: "login:ip", points: 100, duration: 15 * MINUTE }),

  // failed logins from one IP across all accounts (password spraying)
  loginFailIp: createLimiter({
    keyPrefix: "login:fail:ip",
    points: 30,
    duration: 60 * MINUTE,
    blockDuration: 60 * MINUTE,
  }),

  // failed logins for one account from any IP (guessing one password); cleared on success
  loginFailAccount: createLimiter({
    keyPrefix: "login:fail:account",
    points: 10,
    duration: 15 * MINUTE,
    blockDuration: 15 * MINUTE,
  }),

  // token refreshes from one IP; a tab refreshes about once per access-token lifetime
  refreshIp: createLimiter({ keyPrefix: "refresh:ip", points: 120, duration: MINUTE }),
};

// ------------------------------------------------------------------ helpers

const clientIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? "unknown";

// emails and phones never appear in Redis keys
const hashKey = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);

const describeWait = (seconds: number) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const tooManyRequests = (res: Response, limit: RateLimiterRes, message: string) => {
  const seconds = Math.max(1, Math.ceil(limit.msBeforeNext / 1000));
  res.set("Retry-After", String(seconds));
  return new AppError(`${message} Try again in ${describeWait(seconds)}.`, httpStatus.TOO_MANY_REQUESTS, {
    retryAfter: seconds,
  });
};

/*
 * consume() rejects with a RateLimiterRes when the limit is hit, or with an
 * Error when the store fails and no insurance limiter could answer. A store
 * failure lets the request through rather than locking everyone out.
 */
const isLimitHit = (error: unknown): error is RateLimiterRes => error instanceof RateLimiterRes;

const ignoreStoreError = (promise: Promise<unknown>) => promise.catch(() => undefined);

// ---------------------------------------------------------------- middleware

/** Every login attempt from one IP. Runs before validation, so junk requests count too. */
export const loginIpLimit: RequestHandler = async (req, res, next) => {
  try {
    await limiters.loginIp.consume(clientIp(req));
    next();
  } catch (error) {
    if (!isLimitHit(error)) return next();
    next(tooManyRequests(res, error, "Too many login attempts from your network."));
  }
};

/*
 * Failed-login limits for one account and one IP. Runs after validation, so the
 * email or phone is already normalised and "A@x.com" and "a@x.com" share a key.
 *
 * Each attempt takes a point up front, so a burst of parallel guesses can't all
 * slip past the check. The point is given back unless the server answers 401
 * (wrong credentials); a successful login clears the account's count.
 */
export const loginFailureLimit = (scope: "PLATFORM" | "SCHOOL"): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = clientIp(req);
    const identifier: string = scope === "PLATFORM" ? req.body.email : req.body.identifier;
    const school = scope === "SCHOOL" ? DomainUtils.getSchoolSubdomain(req.hostname) ?? "-" : "platform";
    const accountKey = hashKey(`${school}:${identifier}`);

    try {
      await limiters.loginFailAccount.consume(accountKey);
    } catch (error) {
      if (isLimitHit(error)) {
        return next(tooManyRequests(res, error, "Too many failed login attempts for this account."));
      }
    }

    try {
      await limiters.loginFailIp.consume(ip);
    } catch (error) {
      if (isLimitHit(error)) {
        await ignoreStoreError(limiters.loginFailAccount.reward(accountKey, 1));
        return next(tooManyRequests(res, error, "Too many failed login attempts from your network."));
      }
    }

    res.on("finish", () => {
      if (res.statusCode === httpStatus.UNAUTHORIZED) return; // a real failure: keep both points

      if (res.statusCode < 300) {
        void ignoreStoreError(limiters.loginFailAccount.delete(accountKey));
      } else {
        void ignoreStoreError(limiters.loginFailAccount.reward(accountKey, 1));
      }
      void ignoreStoreError(limiters.loginFailIp.reward(ip, 1));
    });

    next();
  };
};

/** Token refreshes from one IP. */
export const refreshIpLimit: RequestHandler = async (req, res, next) => {
  try {
    await limiters.refreshIp.consume(clientIp(req));
    next();
  } catch (error) {
    if (!isLimitHit(error)) return next();
    next(tooManyRequests(res, error, "Too many requests."));
  }
};
