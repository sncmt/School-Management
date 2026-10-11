import "dotenv/config";
import { setDefaultResultOrder } from "node:dns";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/*
 * The API's database connection. On Supabase, DATABASE_URL is the pooled
 * "transaction" connection (port 6543); migrations use DIRECT_URL instead
 * (see prisma.config.ts).
 *
 * DATABASE_SSL_CA: path to the database's CA certificate (Supabase: Database
 * settings > SSL configuration > Download certificate). With it the connection
 * is encrypted and the server's certificate is checked. Leave it out locally.
 * Don't put sslmode in DATABASE_URL as well: settings in the URL win.
 */
const sslCa = process.env.DATABASE_SSL_CA;

// IPv4 first: on networks with broken IPv6 (NAT64), connecting to a hosted
// database over IPv6 takes 10+ seconds or fails; over IPv4 it takes ~2 s.
setDefaultResultOrder("ipv4first");

const adapter = new PrismaPg({
  connectionString: `${process.env.DATABASE_URL}`,
  // connections this API keeps open; the pooler shares the database's own limit
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  ...(sslCa ? { ssl: { ca: readFileSync(sslCa, "utf8"), rejectUnauthorized: true } } : {}),
});
const prisma = new PrismaClient({ adapter });

export { prisma };
