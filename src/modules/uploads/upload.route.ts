import { Router, Router as ExpressRouter } from "express";
import multer from "multer";
import * as uploadController from "./upload.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { env } from "../../config/env";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const router: ExpressRouter = Router();

// Image-only uploader for the feedback composer (routed to ImageKit).
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowedImageMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.post("/", authenticate, upload.single("file"), uploadController.uploadFile);
// ImageKit-backed image upload — must be declared before the `/:fileId` GET so
// the literal path is never mistaken for a file id.
router.post("/image", authenticate, imageUpload.single("file"), uploadController.uploadImage);
router.get("/:fileId", uploadController.getFile);
router.delete("/:fileId", authenticate, uploadController.deleteFile);

export default router;