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

router.post("/:formId/blocks", validate(createBlockSchema), blockController.createBlock);
router.get("/:formId/blocks", blockController.getBlocks);
router.patch("/:formId/blocks/:blockId", validate(updateBlockSchema), blockController.updateBlock);
router.delete("/:formId/blocks/:blockId", validate(blockIdParamSchema), blockController.deleteBlock);
router.patch("/:formId/blocks/reorder", validate(reorderBlocksSchema), blockController.reorderBlocks);

export default router;