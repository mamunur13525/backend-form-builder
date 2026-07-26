import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { v4 as uuidv4 } from "uuid";
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
  const fieldKey = `field_${uuidv4().slice(0, 8)}`;

  const field = await fieldRepo.createField({
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
    appearance: data.appearance || { width: "full", icon: "" },
  });

  return field.toObject();
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
  return field.toObject();
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

  const updated = await fieldRepo.updateField(fieldId, data);
  return updated!.toObject();
};

export const deleteField = async (
  formId: string,
  fieldId: string
): Promise<void> => {
  const field = await fieldRepo.findFieldById(formId, fieldId);
  if (!field) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }
  await fieldRepo.deleteField(fieldId);
};

export const reorderFields = async (
  formId: string,
  data: ReorderFieldsBody
): Promise<void> => {
  const updates = data.fieldIds.map((fieldId, index) => ({
    fieldId,
    order: index + 1,
  }));

  await fieldRepo.updateFieldOrders(updates);
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
  const fieldKey = `field_${uuidv4().slice(0, 8)}`;

  const newField = await fieldRepo.createField({
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
    appearance: field.appearance,
  });

  return newField.toObject();
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

  const updated = await fieldRepo.updateField(fieldId, { logic: data.logic });
  return updated!.toObject();
};

export const deleteFieldLogic = async (
  formId: string,
  fieldId: string
): Promise<any> => {
  const field = await fieldRepo.findFieldById(formId, fieldId);
  if (!field) {
    throw new ApiError(httpStatus.NOT_FOUND, "Field not found");
  }

  const updated = await fieldRepo.updateField(fieldId, { logic: [] });
  return updated!.toObject();
};