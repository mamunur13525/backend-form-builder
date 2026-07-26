import { Router, Router as ExpressRouter } from "express";
import * as fieldController from "./field.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createFieldSchema,
  updateFieldSchema,
  reorderFieldsSchema,
  fieldLogicSchema,
  fieldIdParamSchema,
  deleteFieldLogicSchema,
} from "./field.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

router.post("/:formId/fields", validate(createFieldSchema), fieldController.createField);
router.get("/:formId/fields", fieldController.getFields);
router.get("/:formId/fields/:fieldId", validate(fieldIdParamSchema), fieldController.getFieldById);
router.patch("/:formId/fields/:fieldId", validate(updateFieldSchema), fieldController.updateField);
router.delete("/:formId/fields/:fieldId", validate(fieldIdParamSchema), fieldController.deleteField);
router.patch("/:formId/fields/reorder", validate(reorderFieldsSchema), fieldController.reorderFields);
router.patch("/:formId/fields/:fieldId/duplicate", validate(fieldIdParamSchema), fieldController.duplicateField);
router.patch("/:formId/fields/:fieldId/logic", validate(fieldLogicSchema), fieldController.updateFieldLogic);
router.delete("/:formId/fields/:fieldId/logic", validate(deleteFieldLogicSchema), fieldController.deleteFieldLogic);

export default router;