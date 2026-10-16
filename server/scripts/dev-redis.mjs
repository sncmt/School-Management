/*
 * Development only (npm run dev): starts Redis in WSL and keeps WSL running while the
 * API runs; WSL shuts its Linux side down a few seconds after nothing uses it.
 *
 * The keep-alive runs in its own hidden console. Run in the terminal, wsl.exe switches
 * the terminal's keyboard to raw input, and then Ctrl+C is passed to Linux as a character
 * instead of stopping the API.
 */
import { spawn, spawnSync } from "node:child_process";

const DISTRO = process.env.WSL_DISTRO ?? "Ubuntu";
const wsl = (...args) => ["-d", DISTRO, "-u", "root", "--", ...args];

const started = spawnSync("wsl", wsl("service", "redis-server", "start"), {
  stdio: ["ignore", "inherit", "inherit"],
  windowsHide: true,
});
if (started.status !== 0) {
  console.error("Couldn't start Redis in WSL. The API still runs; rate limits use memory.");
}

const keepAlive = spawn("wsl", wsl("sleep", "infinity"), { detached: true, stdio: "ignore", windowsHide: true });

const stop = () => {
  // the keep-alive and its WSL helper processes
  spawnSync("taskkill", ["/PID", String(keepAlive.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", () => {
  if (keepAlive.exitCode === null) spawnSync("taskkill", ["/PID", String(keepAlive.pid), "/T", "/F"], { stdio: "ignore" });
});

// stay alive alongside the API
setInterval(() => {}, 1 << 30);
