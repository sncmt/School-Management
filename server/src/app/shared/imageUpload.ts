import type { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";
import multer from "multer";
import sharp, { type Sharp } from "sharp";
import { AppError } from "../errorHandler/AppError";

/*
 * Image uploads: one file in the "file" field, held in memory (they are small), then
 * checked and resized with sharp before it goes to storage. The type is read from the
 * image itself, never trusted from the browser.
 */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single("file");

/** Reads one image upload into req.file, turning multer's errors into ours. */
export const imageUploadMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (error: unknown) => {
    if (!error) {
      if (!req.file) return next(new AppError("Choose an image to upload", httpStatus.BAD_REQUEST));
      return next();
    }
    if (error instanceof multer.MulterError) {
      return next(
        error.code === "LIMIT_FILE_SIZE"
          ? new AppError("The image is too large. The limit is 5 MB", 413)
          : new AppError("Upload one image in the \"file\" field", httpStatus.BAD_REQUEST),
      );
    }
    next(error);
  });
};

// formats sharp can read here (phones' HEIC needs a library the prebuilt sharp doesn't have)
const ACCEPTED = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff"]);

/*
 * What each use stores:
 *   logo     at most 512 px, transparency kept
 *   favicon  64 px square, PNG (every browser shows it)
 *   photo    400 px square, cropped to the centre
 *   slide    1600 x 1200 (4 : 3), cropped to the busiest part (the homepage hero's picture frame)
 *   about    1200 x 900 (4 : 3), cropped the same way (beside the homepage's about text)
 *   gallery  its own shape, at most 1600 px on the longer side
 */
const PRESETS = {
  logo: (image: Sharp) => image.resize(512, 512, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }),
  favicon: (image: Sharp) => image.resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png(),
  photo: (image: Sharp) => image.resize(400, 400, { fit: "cover", position: "attention" }).webp({ quality: 80 }),
  slide: (image: Sharp) => image.resize(1600, 1200, { fit: "cover", position: "attention" }).webp({ quality: 80 }),
  about: (image: Sharp) => image.resize(1200, 900, { fit: "cover", position: "attention" }).webp({ quality: 80 }),
  gallery: (image: Sharp) => image.resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }),
} as const;

export type ImagePreset = keyof typeof PRESETS;

/** The upload as a stored image: checked, turned upright, resized and re-encoded. */
export const processImage = async (buffer: Buffer, preset: ImagePreset) => {
  let format: string | undefined;
  try {
    format = (await sharp(buffer).metadata()).format;
  } catch {
    format = undefined;
  }
  if (!format || !ACCEPTED.has(format)) {
    throw new AppError("Upload a JPG, PNG or WebP image", httpStatus.UNSUPPORTED_MEDIA_TYPE);
  }

  // rotate() applies the camera's orientation, so a phone photo isn't sideways
  const body = await PRESETS[preset](sharp(buffer).rotate()).toBuffer();
  const isPng = preset === "favicon";
  return { body, contentType: isPng ? "image/png" : "image/webp", extension: isPng ? "png" : "webp" };
};
