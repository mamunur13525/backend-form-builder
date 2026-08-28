import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import { ApiError } from "../../utils/ApiError";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { env } from "../../config/env";
import * as imagekit from "./imagekit.service";

// Ensure upload directory exists
const uploadDir = path.resolve(env.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const uploadFile: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }

  const file = req.file;
  const fileId = nanoid();
  const ext = path.extname(file.originalname);
  const filename = `${fileId}${ext}`;
  const filePath = path.join(uploadDir, filename);

  // Write file to disk
  fs.writeFileSync(filePath, file.buffer);

  sendSuccess(res, {
    fileId,
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/api/v1/uploads/${fileId}`,
  }, "File uploaded successfully", httpStatus.CREATED);
});

/**
 * Upload an image to ImageKit and return its CDN URL. Used by the feedback
 * board's "Give feedback" composer; the image itself is stored on ImageKit,
 * not on local disk.
 */
export const uploadImage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No image uploaded");
  }

  const file = req.file;
  const result = await imagekit.uploadImageToImageKit(
    file.buffer,
    file.originalname,
    file.mimetype
  );

  sendSuccess(
    res,
    {
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      fileId: result.fileId,
      width: result.width,
      height: result.height,
    },
    "Image uploaded successfully",
    httpStatus.CREATED
  );
});

export const getFile: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const fileId = req.params.fileId as string;

  // Find file in upload directory
  const files = fs.readdirSync(uploadDir);
  const file = files.find((f) => f.startsWith(fileId));

  if (!file) {
    throw new ApiError(httpStatus.NOT_FOUND, "File not found");
  }

  const filePath = path.join(uploadDir, file);
  const ext = path.extname(file).toLowerCase();

  // Set content type based on extension
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  const contentType = mimeTypes[ext] || "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  res.sendFile(filePath);
});

export const deleteFile: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const fileId = req.params.fileId as string;

  const files = fs.readdirSync(uploadDir);
  const file = files.find((f) => f.startsWith(fileId));

  if (!file) {
    throw new ApiError(httpStatus.NOT_FOUND, "File not found");
  }

  fs.unlinkSync(path.join(uploadDir, file));
  sendSuccess(res, null, "File deleted successfully");
});