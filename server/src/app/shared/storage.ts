import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";
import httpStatus from "http-status";
import config from "../config";
import { AppError } from "../errorHandler/AppError";

/*
 * File storage on Cloudflare R2 (S3-compatible: moving to S3, B2 or MinIO is a config
 * change). The bucket is private: the database keeps each file's key, and readers get a
 * short-lived signed link. Keys are laid out per school:
 *   schools/{schoolId}/logo-{random}.webp
 *   schools/{schoolId}/teachers/{teacherId}/photo-{random}.webp
 */

const { accountId, accessKeyId, secretAccessKey, bucket } = config.r2;

export const storageConfigured = !!(accountId && accessKeyId && secretAccessKey && bucket);

let client: S3Client | null = null;

const getClient = () => {
  if (!storageConfigured) {
    throw new AppError("File storage isn't set up yet. Add the R2 settings to the server", httpStatus.SERVICE_UNAVAILABLE);
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
  });
  return client;
};

// a file stored before R2 (or set by hand) may be a full URL: pass it through as it is
const isUrl = (value: string) => /^https?:\/\//i.test(value);

/** A new key: a fresh random part per upload, so a replaced file never reuses an old link. */
export const fileKey = (folder: string, name: string, extension: string) =>
  `${folder}/${name}-${randomBytes(6).toString("hex")}.${extension}`;

export const putFile = async (key: string, body: Buffer, contentType: string) => {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // a key never changes content, so it can be cached for good
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );
};

/** Best effort: a file left behind costs a little storage, never a failed request. */
export const deleteFile = async (key: string | null | undefined) => {
  if (!key || isUrl(key) || !storageConfigured) return;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error(`Could not delete ${key} from storage:`, (error as Error).message);
  }
};

const HOUR_MS = 3_600_000;

/*
 * A signed link to read a file, or null. It is signed as of the start of the current
 * hour and lasts two, so the same file gets the same link for the whole hour: browsers
 * (and Next's cache) can keep it, and it always has at least an hour left.
 */
export const fileUrl = async (key: string | null | undefined) => {
  if (!key) return null;
  if (isUrl(key)) return key;
  if (!storageConfigured) return null;

  const signingDate = new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS);
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: 2 * 3600,
    signingDate,
  });
};

/** The same record with the named file fields turned from keys into signed links. */
export const withFileUrls = async <T extends object, K extends keyof T>(record: T, fields: K[]) => {
  const urls = await Promise.all(fields.map((field) => fileUrl(record[field] as string | null | undefined)));
  return { ...record, ...Object.fromEntries(fields.map((field, i) => [field, urls[i]])) } as T;
};
