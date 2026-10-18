import type { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";
import multer from "multer";
import sharp from "sharp";
import { AppError } from "../errorHandler/AppError";

/*
 * An attachment (a notice's or a homework's): one PDF or image in the "file" field, up to 10 MB. The type is
 * read from the file itself, never trusted from the browser. Images are shrunk to a
 * readable size and re-encoded (which also drops hidden data such as the camera's GPS).
 */

const MAX_BYTES = 10 * 1024 * 1024;

// utf8: browsers send file names as UTF-8 (Bangla names), multer reads latin1 by default
const upload = multer({ storage: multer.memoryStorage(), defParamCharset: "utf8", limits: { fileSize: MAX_BYTES, files: 1 } }).single("file");

export const attachmentUploadMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (error: unknown) => {
    if (!error) {
      if (!req.file) return next(new AppError("Choose a file to attach", httpStatus.BAD_REQUEST));
      return next();
    }
    if (error instanceof multer.MulterError) {
      return next(
        error.code === "LIMIT_FILE_SIZE"
          ? new AppError("The file is too large. The limit is 10 MB", 413)
          : new AppError('Upload one file in the "file" field', httpStatus.BAD_REQUEST),
      );
    }
    next(error);
  });
};

const IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

/** The file as stored: a PDF as it is, an image at most 2000 px as WebP; anything else is refused. */
export const prepareAttachment = async (buffer: Buffer, originalName: string) => {
  const base = originalName.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{M}\p{N} ._-]/gu, "").trim().slice(0, 100) || "file";

  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") {
    return { body: buffer, contentType: "application/pdf", extension: "pdf", name: `${base}.pdf` };
  }

  let format: string | undefined;
  try {
    format = (await sharp(buffer).metadata()).format;
  } catch {
    format = undefined;
  }
  if (!format || !IMAGE_FORMATS.has(format)) {
    throw new AppError("Attach a PDF or an image (JPG, PNG, WebP)", httpStatus.UNSUPPORTED_MEDIA_TYPE);
  }
  const body = await sharp(buffer).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  return { body, contentType: "image/webp", extension: "webp", name: `${base}.webp` };
};
