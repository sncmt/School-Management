import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import config from "../config";

/*
 * Encryption at rest for sensitive data we must be able to read back (fingerprint
 * templates): AES-256-GCM, a fresh IV each time, stored as "iv.tag.ciphertext" in base64.
 * The key comes from DEVICE_DATA_KEY; without it, from the JWT secret (set DEVICE_DATA_KEY
 * in production so changing the JWT secret never makes stored data unreadable).
 */

const keySource = process.env.DEVICE_DATA_KEY || `${config.jwt.access_secret ?? ""}:device-data`;
const KEY = createHash("sha256").update(keySource).digest();

export const seal = (plain: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
};

export const open = (sealed: string) => {
  const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
};
