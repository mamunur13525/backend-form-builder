import { Form, IForm, IFormSettings } from "../../models/Form";
import { IFormVersion } from "../../models/FormVersion";
import { ensureDraftVersion } from "../forms/version.helper";

export interface DraftContext {
  form: IForm;
  draftVersion: IFormVersion;
}

/**
 * Loads the form and its editable draft version. The draft is created (or
 * cloned from the published version) on demand so the admin never touches a
 * live version.
 */
export const getDraftContext = async (formId: string): Promise<DraftContext | null> => {
  const form = await Form.findById(formId);
  if (!form) return null;

  const draftVersion = await ensureDraftVersion(form);
  return { form, draftVersion };
};

/**
 * Persists a full settings object into the draft version and syncs the Form
 * document for backwards compatibility. Marks the form as having unpublished
 * changes when a published version exists.
 */
export const saveSettings = async (
  form: IForm,
  draftVersion: IFormVersion,
  settings: any
): Promise<IFormSettings> => {
  draftVersion.formSchema.settings = settings;
  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.settings = settings;
  await form.save();

  return settings;
};