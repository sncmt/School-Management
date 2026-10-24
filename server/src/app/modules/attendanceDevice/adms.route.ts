import express, { type Request, type Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { prisma } from "../../../../lib/prisma";
import { PeopleService } from "./people.service";
import { processSoon } from "./processor.service";

/*
 * The ADMS ("push") protocol that ZKTeco-type terminals speak, mounted at /iclock outside
 * /api/v1: plain text over HTTP, no login (a device has none). A device is known only by
 * its serial number (SN), so only serial numbers a school has registered, on active devices
 * of active schools, get any answer but a refusal.
 *
 *   GET  /iclock/cdata?SN=…&options=all      handshake: the device asks for its settings
 *   POST /iclock/cdata?SN=…&table=ATTLOG     punches, one per line: PIN \t time \t status \t verify …
 *   POST /iclock/cdata?SN=…&table=OPERLOG    people / fingerprints enrolled on the device ("USER …", "FP …")
 *   GET  /iclock/getrequest?SN=…&INFO=…      polling: we answer with waiting commands, "C:<seq>:<command>"
 *   POST /iclock/devicecmd?SN=…              results of commands
 *
 * Every answer is text/plain. Device times are Bangladesh local time (UTC+6, no DST).
 */

const router = express.Router();

// the devices send text (often labelled octet-stream): take any body as text
router.use(express.text({ type: () => true, limit: "2mb" }));

// generous: a busy gate sends a request every few seconds, a whole school may share one IP
const limiter = new RateLimiterMemory({ points: 600, duration: 60 });
router.use(async (req, res, next) => {
  try {
    await limiter.consume(req.ip ?? "unknown");
    next();
  } catch {
    res.status(429).type("text/plain").send("Too many requests");
  }
});

const reply = (res: Response, body: string, status = 200) => res.status(status).type("text/plain").send(body);

/*
 * The address the request came from. Behind the site's proxy (as deployed) Express takes it
 * from X-Forwarded-For as the proxy wrote it; IPv4 written as IPv6 ("::ffff:1.2.3.4") is
 * read as plain IPv4.
 */
export const clientIp = (req: Request) => (req.ip ?? "").replace(/^::ffff:/, "");

const serialOf = (req: Request) => String(req.query.SN ?? req.query.sn ?? "").trim();

/* The registered, active device for this request, noting that it was seen; null when refused. */
const deviceOf = async (req: Request) => {
  const serialNumber = serialOf(req);
  if (!serialNumber || serialNumber.length > 64) return null;
  const device = await prisma.attendanceDevice.findUnique({
    where: { serialNumber },
    select: { id: true, schoolId: true, isActive: true, allowedIp: true, attlogStamp: true, operlogStamp: true, school: { select: { status: true } } },
  });
  if (!device || !device.isActive || device.school.status !== "ACTIVE") return null;
  // locked to the school's internet address: anything else is refused (and noted for the school)
  if (device.allowedIp && device.allowedIp !== clientIp(req)) {
    await prisma.attendanceDevice.update({ where: { id: device.id }, data: { lastRefusedIp: clientIp(req), lastRefusedAt: new Date() } });
    return null;
  }

  // INFO=firmware,users,fingers,punches,ip,… (sent with getrequest by most firmwares)
  const info = typeof req.query.INFO === "string" ? req.query.INFO.split(",") : null;
  await prisma.attendanceDevice.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      lastIp: clientIp(req) || null,
      ...(info?.[0] ? { firmware: info[0].trim().slice(0, 60) } : {}),
      ...(typeof req.query.DeviceType === "string" ? { model: req.query.DeviceType.slice(0, 60) } : {}),
    },
  });
  return device;
};

/* "2026-10-21 08:12:03" (Bangladesh time) as a moment, or null when it is not a real time. */
export const fromDeviceTime = (value: string) => {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(value.trim());
  if (!m) return null;
  const at = new Date(`${m[1]}T${m[2].length === 5 ? `${m[2]}:00` : m[2]}+06:00`);
  return Number.isNaN(at.getTime()) ? null : at;
};

/* Punch lines into rows; bad lines are skipped (a device never resends them anyway). */
export const parseAttlog = (body: string) =>
  body
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .flatMap(([pin, time, status, verify]) => {
      const punchedAt = time ? fromDeviceTime(time) : null;
      const cleanPin = pin?.trim();
      if (!cleanPin || !/^[\w-]{1,24}$/.test(cleanPin) || !punchedAt) return [];
      const num = (v: string | undefined) => (v !== undefined && /^\d+$/.test(v.trim()) ? Number(v.trim()) : null);
      return [{ pin: cleanPin, punchedAt, status: num(status), verifyType: num(verify), raw: [pin, time, status, verify].filter((v) => v !== undefined).join("\t") }];
    });

// handshake: the device's settings
router.get("/cdata", async (req, res) => {
  try {
    const device = await deviceOf(req);
    if (!device) return reply(res, "Unknown device", 403);
    const sn = serialOf(req);
    reply(
      res,
      [
        `GET OPTION FROM: ${sn}`,
        // from where the device should send its punches again (None: everything it has)
        `ATTLOGStamp=${device.attlogStamp ?? "None"}`,
        // people and fingerprints enrolled on the device, from where it last stopped
        `OPERLOGStamp=${device.operlogStamp ?? "None"}`,
        "ATTPHOTOStamp=9999",
        "ErrorDelay=30",
        "Delay=10",
        "TransTimes=00:00;14:05",
        "TransInterval=1",
        "TransFlag=TransData AttLog\tOpLog\tEnrollUser\tChgUser\tEnrollFP\tChgFP",
        // Bangladesh, UTC+6
        "TimeZone=6",
        "Realtime=1",
        "Encrypt=None",
      ].join("\n"),
    );
  } catch {
    reply(res, "ERROR", 500);
  }
});

// uploads: punches (ATTLOG), people and fingerprints (OPERLOG, or USERINFO / FINGERTMP); the rest is accepted and ignored
router.post("/cdata", async (req, res) => {
  try {
    const device = await deviceOf(req);
    if (!device) return reply(res, "Unknown device", 403);
    const table = String(req.query.table ?? "").toUpperCase();
    const body = typeof req.body === "string" ? req.body : "";
    const stampOf = () => (typeof req.query.Stamp === "string" ? req.query.Stamp.slice(0, 40) : null);

    if (table === "OPERLOG" || table === "USERINFO" || table === "FINGERTMP") {
      await PeopleService.receiveOperlog(device, body, table);
      const stamp = stampOf();
      if (stamp && table === "OPERLOG") await prisma.attendanceDevice.update({ where: { id: device.id }, data: { operlogStamp: stamp } });
      return reply(res, "OK");
    }
    if (table !== "ATTLOG") return reply(res, "OK");

    const rows = parseAttlog(body);
    if (rows.length > 0) {
      await prisma.devicePunch.createMany({
        data: rows.map((r) => ({ ...r, schoolId: device.schoolId, deviceId: device.id })),
        // the same punch sent again is kept once
        skipDuplicates: true,
      });
    }
    const stamp = stampOf();
    if (stamp) await prisma.attendanceDevice.update({ where: { id: device.id }, data: { attlogStamp: stamp } });
    reply(res, `OK: ${rows.length}`);
    // into attendance straight away (the device does not wait for it)
    if (rows.length > 0) void processSoon(device.schoolId);
  } catch {
    reply(res, "ERROR", 500);
  }
});

// polling: the next waiting commands, or "OK" when there are none
router.get("/getrequest", async (req, res) => {
  try {
    const device = await deviceOf(req);
    if (!device) return reply(res, "Unknown device", 403);
    reply(res, (await PeopleService.nextCommands(device.id)) ?? "OK");
  } catch {
    reply(res, "ERROR", 500);
  }
});

// the results of commands: "ID=<seq>&Return=<code>&CMD=…" lines
router.post("/devicecmd", async (req, res) => {
  try {
    const device = await deviceOf(req);
    if (!device) return reply(res, "Unknown device", 403);
    await PeopleService.receiveResults(device.id, typeof req.body === "string" ? req.body : "");
    reply(res, "OK");
  } catch {
    reply(res, "ERROR", 500);
  }
});

router.get("/ping", (_req, res) => reply(res, "OK"));

export const admsRoutes = router;
