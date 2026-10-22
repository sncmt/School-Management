#!/usr/bin/env node
/*
 * Acts like a ZKTeco-type attendance terminal talking ADMS to our server, for building and
 * testing without hardware. It does what a real device does: the handshake, a poll for
 * commands (with its INFO), then uploads punches.
 *
 *   node scripts/device-simulator.mjs --sn SIM0001 --pins 101,102 [--url http://localhost:5000]
 *        [--at "2026-10-21 08:05:00"] [--gap 7] [--stamp 1]
 *
 * --pins   the people's device numbers; each punches once, --gap minutes apart from --at
 * --at     the first punch, Bangladesh local time (default: now)
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith("--") ? [...pairs, [arg.slice(2), all[i + 1] ?? ""]] : pairs), []),
);

const url = (args.url || "http://localhost:5000").replace(/\/$/, "");
const sn = args.sn;
if (!sn) {
  console.error("Give the device's serial number: --sn SIM0001");
  process.exit(1);
}
const pins = (args.pins || "").split(",").map((p) => p.trim()).filter(Boolean);
const gap = Number(args.gap || 7);

// Bangladesh local time, as a device writes it: "2026-10-21 08:05:00"
const local = (date) => new Date(date.getTime() + 6 * 3_600_000).toISOString().slice(0, 19).replace("T", " ");
const first = args.at ? new Date(`${args.at.replace(" ", "T")}+06:00`) : new Date();

const call = async (method, path, body) => {
  const res = await fetch(`${url}/iclock/${path}`, {
    method,
    headers: { "Content-Type": "application/octet-stream", "User-Agent": "iClock Proxy/1.09" },
    body,
  });
  const text = await res.text();
  console.log(`${method} /iclock/${path.split("?")[0]} -> ${res.status}\n  ${text.replace(/\n/g, "\n  ")}`);
  return { status: res.status, text };
};

const q = (extra) => `SN=${encodeURIComponent(sn)}${extra ? `&${extra}` : ""}`;

// --poll N: answer every command collected as done (Return=0), like a device that carried it out
const polling = Number(args.poll || 0) > 0;
const answer = async (text) => {
  const ids = [...text.matchAll(/^C:(\d+):/gm)].map((m) => m[1]);
  if (ids.length > 0) await call("POST", `devicecmd?${q()}`, ids.map((id) => `ID=${id}&Return=0&CMD=DATA`).join("\n"));
  return ids.length;
};

await call("GET", `cdata?${q("options=all&pushver=2.4.1&language=69")}`);
// the first poll also tells the server about the device, and may already bring commands
const firstPoll = await call("GET", `getrequest?${q(`INFO=${encodeURIComponent("Ver 8.0.4.2-SIM,3,2,10,192.168.1.50")}`)}`);
if (polling) await answer(firstPoll.text);

// --enroll PIN: a fingerprint taken on this device (finger 0); --card PIN:CARD: a card registered on it
if (args.enroll) {
  const tmp = Buffer.from(`SIMULATED-TEMPLATE-${args.enroll}-${Date.now()}`).toString("base64");
  await call("POST", `cdata?${q("table=OPERLOG&Stamp=" + Date.now())}`, `FP PIN=${args.enroll}\tFID=0\tSize=${tmp.length}\tValid=1\tTMP=${tmp}`);
}
if (args.card) {
  const [pin, card] = args.card.split(":");
  await call("POST", `cdata?${q("table=OPERLOG&Stamp=" + Date.now())}`, `USER PIN=${pin}\tName=\tPri=0\tPasswd=\tCard=${card}\tGrp=1\tTZ=0000000100000000`);
}

// more polls, up to N in all, until no commands are left
for (let i = 1; i < Number(args.poll || 0); i++) {
  const { text } = await call("GET", `getrequest?${q()}`);
  if ((await answer(text)) === 0) break;
}

if (pins.length > 0) {
  // PIN \t time \t status (0 = check-in) \t verify (1 = finger, 4 = card) \t workcode
  const lines = pins.map((pin, i) => [pin, local(new Date(first.getTime() + i * gap * 60_000)), "0", i % 2 ? "4" : "1", "0"].join("\t"));
  await call("POST", `cdata?${q(`table=ATTLOG&Stamp=${args.stamp || Date.now()}`)}`, lines.join("\n"));
}
