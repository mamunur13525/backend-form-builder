import { Router, Router as ExpressRouter } from "express";
import * as formController from "./form.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createFormSchema,
  updateFormSchema,
  formIdParamSchema,
  updateFormSettingsSchema,
  updateFormThemeSchema,
  updateFormShareSchema,
} from "./form.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

router.post("/", validate(createFormSchema), formController.createForm);
router.get("/", formController.getAllForms);
router.get("/:formId", validate(formIdParamSchema), formController.getFormById);
router.patch("/:formId", validate(updateFormSchema), formController.updateForm);
router.delete("/:formId", validate(formIdParamSchema), formController.deleteForm);
router.patch("/:formId/duplicate", validate(formIdParamSchema), formController.duplicateForm);
router.patch("/:formId/archive", validate(formIdParamSchema), formController.archiveForm);
router.patch("/:formId/restore", validate(formIdParamSchema), formController.restoreForm);
router.patch("/:formId/publish", validate(formIdParamSchema), formController.publishForm);
router.post("/:formId/publish", validate(formIdParamSchema), formController.publishForm);
router.patch("/:formId/unpublish", validate(formIdParamSchema), formController.unpublishForm);
router.post("/:formId/discard", validate(formIdParamSchema), formController.discardDraft);
router.get("/:formId/versions", validate(formIdParamSchema), formController.getFormVersions);
router.get("/:formId/slug", validate(formIdParamSchema), formController.getFormSlug);
router.patch("/:formId/settings", validate(updateFormSettingsSchema), formController.updateFormSettings);
router.patch("/:formId/theme", validate(updateFormThemeSchema), formController.updateFormTheme);
router.patch("/:formId/share", validate(updateFormShareSchema), formController.updateFormShare);

export default router;