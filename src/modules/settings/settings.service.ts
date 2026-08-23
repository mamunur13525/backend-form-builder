import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { normalizeFormSettings, resolveVariableDefaults } from "../../models/Form";
import * as settingsRepo from "./settings.repository";
import {
  SettingsResult,
  SettingsSection,
  UpdateAccessSettingsBody,
  UpdateEmailSettingsBody,
  UpdateGeneralSettingsBody,
  UpdateHiddenFieldsBody,
  UpdateVariablesBody,
} from "./settings.types";

/**
 * Deep-merges a partial patch into the stored value. Arrays (hidden-field
 * lists, variables) are replaced wholesale rather than merged element-wise,
 * which matches how the UI submits them. `null` is treated as an explicit
 * value (clears a field, e.g. a close-form date); only `undefined` means
 * "leave unchanged".
 */
const mergeDeep = (base: any, patch: any): any => {
  if (patch === undefined) return base;
  if (patch === null) return null;
  if (base === undefined || base === null) return patch;
  if (Array.isArray(base) || Array.isArray(patch)) return patch;
  if (typeof base === "object" && typeof patch === "object") {
    const result: Record<string, any> = { ...base };
    for (const key of Object.keys(patch)) {
      if (patch[key] === undefined) continue;
      result[key] = mergeDeep(base[key], patch[key]);
    }
    return result;
  }
  return patch;
};

const sectionDefault = (settings: any, section: SettingsSection): any => {
  const normalized = normalizeFormSettings(settings);
  return section === "variables"
    ? normalized.variables ?? []
    : normalized[section];
};

const buildResult = (form: any, settings: any): SettingsResult => ({
  formId: form._id.toString(),
  settings: normalizeFormSettings(settings),
  hasUnpublishedChanges: !!form.hasUnpublishedChanges,
});

/** Reads the current draft settings for a form. */
export const getSettings = async (formId: string): Promise<SettingsResult> => {
  const ctx = await settingsRepo.getDraftContext(formId);
  if (!ctx) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return buildResult(ctx.form, ctx.draftVersion.formSchema.settings);
};

const updateSection = async (
  formId: string,
  section: SettingsSection,
  patch: any
): Promise<SettingsResult> => {
  const ctx = await settingsRepo.getDraftContext(formId);
  if (!ctx) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const current = normalizeFormSettings(ctx.draftVersion.formSchema.settings);
  const mergedSection = mergeDeep(sectionDefault(current, section), patch);
  const nextSettings = { ...current, [section]: mergedSection };

  // The default variables (score, price) are always stored alongside any
  // custom variables so the persisted document matches what is returned.
  if (section === "variables") {
    nextSettings.variables = resolveVariableDefaults(mergedSection);
  }

  const saved = await settingsRepo.saveSettings(
    ctx.form,
    ctx.draftVersion,
    nextSettings
  );
  return buildResult(ctx.form, saved);
};

export const updateGeneralSettings = async (
  formId: string,
  data: UpdateGeneralSettingsBody
): Promise<SettingsResult> => updateSection(formId, "general", data);

export const updateEmailSettings = async (
  formId: string,
  data: UpdateEmailSettingsBody
): Promise<SettingsResult> => updateSection(formId, "emailSettings", data);

export const updateAccessSettings = async (
  formId: string,
  data: UpdateAccessSettingsBody
): Promise<SettingsResult> => updateSection(formId, "access", data);

export const updateHiddenFields = async (
  formId: string,
  data: UpdateHiddenFieldsBody
): Promise<SettingsResult> => updateSection(formId, "hiddenFields", data);

export const updateVariables = async (
  formId: string,
  data: UpdateVariablesBody
): Promise<SettingsResult> => updateSection(formId, "variables", data.variables);