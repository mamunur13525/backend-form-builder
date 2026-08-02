import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { nanoid } from "nanoid";
import * as fieldRepo from "./field.repository";
import { buildFieldSettings } from "./field.settings";
import { displayOnlyFieldTypes, FieldType } from "../../constants/fieldTypes";
import {
  CreateFieldBody,
  UpdateFieldBody,
  ReorderFieldsBody,
  FieldLogicBody,
} from "./field.types";

/** Statement pages are display-only, so they can never be "required". */
const resolveRequired = (type: string, required?: boolean): boolean =>
  displayOnlyFieldTypes.includes(type as FieldType) ? false : Boolean(required);

export const createField = async (
  formId: string,
  data: CreateFieldBody
): Promise<any> => {
  const order = (await fieldRepo.getMaxOrder(formId)) + 1;
  const fieldKey = `field_${nanoid(8)}`;

  const result = await fieldRepo.createField({
    formId,
    fieldKey,
    label: data.label,
    type: data.type,
    order,
    helperText: data.helperText || "",
    placeholder: data.placeholder || "",
    required: resolveRequired(data.type, data.required),
    coverImage: data.coverImage || undefined,
    options: data.options || [],
    validation: data.validation || {},
    settings: buildFieldSettings(data.type, data.settings),
    appearance: data.appearance || { width: "full", icon: "", submitButtonText: "", submitButtonColor: "" },
  });

  return { field: result.field, hasUnpublishedChanges: result.hasUnpublishedChanges };
};

export const getFieldsByFormId = async (formId: string): Promise<any[]> => {
  return fieldRepo.findFieldsByFormId(formId);
};

export const getFieldById = async (
  formId: string,
  fieldId: string
): Promise<any> => {
  const field = await fieldRepo.findFieldById(formId, fieldId);
  if (!field) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }
  return field;
};

export const updateField = async (
  formId: string,
  fieldId: string,
  data: UpdateFieldBody
): Promise<any> => {
  const field = await fieldRepo.findFieldById(formId, fieldId);
  if (!field) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }

  const payload: Record<string, any> = { ...data };
  const nextType = data.type || field.type;

  // Re-derive settings whenever the type changes or new settings arrive, so a
  // field never keeps settings belonging to its previous type.
  if (data.settings !== undefined || (data.type && data.type !== field.type)) {
    payload.settings = buildFieldSettings(nextType, data.settings ?? field.settings);
  }

  if (data.required !== undefined || data.type) {
    payload.required = resolveRequired(nextType, data.required ?? field.required);
  }

  // Explicit null clears the cover image.
  if (data.coverImage === null) {
    payload.coverImage = undefined;
  }

  const result = await fieldRepo.updateField(formId, fieldId, payload);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }
  return { field: result.field, hasUnpublishedChanges: result.hasUnpublishedChanges };
};

export const deleteField = async (
  formId: string,
  fieldId: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const field = await fieldRepo.findFieldById(formId, fieldId);
  if (!field) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }
  return fieldRepo.deleteField(formId, fieldId);
};

export const reorderFields = async (
  formId: string,
  data: ReorderFieldsBody
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const updates = data.fieldIds.map((fieldId, index) => ({
    fieldId,
    order: index + 1,
  }));

  return fieldRepo.updateFieldOrders(formId, updates);
};

export const duplicateField = async (
  formId: string,
  fieldId: string
): Promise<any> => {
  const field = await fieldRepo.findFieldById(formId, fieldId);
  if (!field) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }

  const order = (await fieldRepo.getMaxOrder(formId)) + 1;
  const fieldKey = `field_${nanoid(8)}`;

  const result = await fieldRepo.createField({
    formId,
    fieldKey,
    label: `${field.label} (copy)`,
    type: field.type,
    order,
    helperText: field.helperText,
    placeholder: field.placeholder,
    required: field.required,
    coverImage: field.coverImage ? { ...field.coverImage } : undefined,
    options: field.options,
    validation: field.validation,
    settings: buildFieldSettings(field.type, field.settings),
    appearance: {
      ...field.appearance,
      submitButtonText: field.appearance.submitButtonText || "",
      submitButtonColor: field.appearance.submitButtonColor || "",
    },
  });

  return { field: result.field, hasUnpublishedChanges: result.hasUnpublishedChanges };
};

export const updateFieldLogic = async (
  formId: string,
  fieldId: string,
  data: FieldLogicBody
): Promise<any> => {
  const field = await fieldRepo.findFieldById(formId, fieldId);
  if (!field) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }

  const result = await fieldRepo.updateField(formId, fieldId, { logic: data.logic });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }
  return { field: result.field, hasUnpublishedChanges: result.hasUnpublishedChanges };
};

export const deleteFieldLogic = async (
  formId: string,
  fieldId: string
): Promise<any> => {
  const field = await fieldRepo.findFieldById(formId, fieldId);
  if (!field) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }

  const result = await fieldRepo.updateField(formId, fieldId, { logic: [] });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }
  return { field: result.field, hasUnpublishedChanges: result.hasUnpublishedChanges };
};
