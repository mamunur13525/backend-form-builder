import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { nanoid } from "nanoid";
import * as fieldRepo from "./field.repository";
import {
  CreateFieldBody,
  UpdateFieldBody,
  ReorderFieldsBody,
  FieldLogicBody,
} from "./field.types";

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
    required: data.required || false,
    options: data.options || [],
    validation: data.validation || {},
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

  const result = await fieldRepo.updateField(formId, fieldId, data);
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
    options: field.options,
    validation: field.validation,
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
