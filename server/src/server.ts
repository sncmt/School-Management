import app from "./app";
import config from "./app/config";
import { prisma } from "../lib/prisma";

const port = Number(config.port ?? 5000);

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// docker stop / restarts send SIGTERM: finish the requests in flight, then close the database pool
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });
  // don't hang forever on a stuck connection
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
