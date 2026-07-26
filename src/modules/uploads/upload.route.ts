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

router.post("/", authenticate, upload.single("file"), uploadController.uploadFile);
router.get("/:fileId", uploadController.getFile);
router.delete("/:fileId", authenticate, uploadController.deleteFile);

export default router;