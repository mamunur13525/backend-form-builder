import { Router, Router as ExpressRouter } from "express";
import * as updateController from "./update.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import {
  createUpdateSchema,
  updateUpdateSchema,
  updateSlugParamSchema,
  updateIdParamSchema,
} from "./update.validation";

const router: ExpressRouter = Router();

// Public reads. `/activity` before `/:slug` so it isn't parsed as a slug.
router.get("/", updateController.listUpdates);
router.get("/activity", updateController.getProductActivity);
router.get("/:slug", validate(updateSlugParamSchema), updateController.getUpdate);

// Admin-only writes.
router.post(
  "/",
  authenticate,
  authorize("admin"),
  validate(createUpdateSchema),
  updateController.createUpdate
);
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validate(updateUpdateSchema),
  updateController.updateUpdate
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validate(updateIdParamSchema),
  updateController.deleteUpdate
);

export default router;
