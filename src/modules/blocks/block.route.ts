import { Router, Router as ExpressRouter } from "express";
import * as blockController from "./block.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createBlockSchema,
  updateBlockSchema,
  reorderBlocksSchema,
  blockIdParamSchema,
} from "./block.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

// Page-scoped endpoints
router.post(
  "/:formId/pages/:pageId/blocks",
  validate(createBlockSchema),
  blockController.createBlock
);
router.get("/:formId/pages/:pageId/blocks", blockController.getBlocks);
router.get(
  "/:formId/pages/:pageId/blocks/:blockId",
  validate(blockIdParamSchema),
  blockController.getBlockById
);
router.patch(
  "/:formId/pages/:pageId/blocks/reorder",
  validate(reorderBlocksSchema),
  blockController.reorderBlocks
);
router.patch(
  "/:formId/pages/:pageId/blocks/:blockId",
  validate(updateBlockSchema),
  blockController.updateBlock
);
router.delete(
  "/:formId/pages/:pageId/blocks/:blockId",
  validate(blockIdParamSchema),
  blockController.deleteBlock
);

// Form-scoped endpoints (operates on specified pageId in body or defaults to first page)
router.post("/:formId/blocks", validate(createBlockSchema), blockController.createBlock);
router.get("/:formId/blocks", blockController.getBlocks);
router.patch("/:formId/blocks/reorder", validate(reorderBlocksSchema), blockController.reorderBlocks);
router.patch("/:formId/blocks/:blockId", validate(updateBlockSchema), blockController.updateBlock);
router.delete("/:formId/blocks/:blockId", validate(blockIdParamSchema), blockController.deleteBlock);

export default router;