import { Router, Router as ExpressRouter } from "express";
import * as logicController from "./logic.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createLogicSchema,
  updateLogicSchema,
  replaceAllLogicSchema,
  logicIdParamSchema,
} from "./logic.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

router.post("/:formId/logic", validate(createLogicSchema), logicController.createLogic);
router.get("/:formId/logic", logicController.getLogics);
router.patch("/:formId/logic/:logicId", validate(updateLogicSchema), logicController.updateLogic);
router.delete("/:formId/logic/:logicId", validate(logicIdParamSchema), logicController.deleteLogic);
router.put("/:formId/logic", validate(replaceAllLogicSchema), logicController.replaceLogic);

export default router;