import mongoose from "mongoose";
import { Form, IFormField } from "../../models/Form";

/**
 * Build a query filter that accepts either a MongoDB _id or a fieldKey.
 */
const buildFieldFilter = (fieldId: string): Record<string, any> => {
  if (mongoose.Types.ObjectId.isValid(fieldId)) {
    return { "fields._id": new mongoose.Types.ObjectId(fieldId) };
  }
  return { "fields.fieldKey": fieldId };
};

export const createField = async (data: {
  formId: string;
  fieldKey: string;
  label: string;
  type: string;
  order: number;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  options?: { label?: string; value?: string }[];
  validation?: any;
  appearance?: any;
}): Promise<IFormField> => {
  const field = {
    fieldKey: data.fieldKey,
    label: data.label,
    type: data.type,
    order: data.order,
    helperText: data.helperText || "",
    placeholder: data.placeholder || "",
    required: data.required || false,
    options: data.options || [],
    validation: data.validation || {},
    appearance: data.appearance || { width: "full", icon: "" },
    isActive: true,
    logic: [],
  };

  const form = await Form.findByIdAndUpdate(
    data.formId,
    { $push: { fields: field } },
    { new: true }
  );

  if (!form) {
    throw new Error("Form not found");
  }

  // Return the last pushed field
  return form.fields[form.fields.length - 1] as unknown as IFormField;
};

export const findFieldsByFormId = async (formId: string): Promise<IFormField[]> => {
  const form = await Form.findById(formId).select("fields").lean();
  if (!form) return [];
  return (form.fields || []).filter((f: any) => f.isActive) as unknown as IFormField[];
};

export const findFieldById = async (
  formId: string,
  fieldId: string
): Promise<IFormField | null> => {
  const filter = buildFieldFilter(fieldId);
  const form = await Form.findOne(
    { _id: formId, ...filter },
    { "fields.$": 1 }
  ).lean();

  if (!form || !form.fields || form.fields.length === 0) return null;
  return form.fields[0] as unknown as IFormField;
};

export const updateField = async (
  formId: string,
  fieldId: string,
  data: Record<string, any>
): Promise<IFormField | null> => {
  const filter = buildFieldFilter(fieldId);
  const setFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    setFields[`fields.$.${key}`] = value;
  }

  // First, perform the update
  await Form.updateOne(
    { _id: formId, ...filter },
    { $set: setFields }
  );

  // Then, fetch the updated field using positional projection
  const form = await Form.findOne(
    { _id: formId, ...filter },
    { "fields.$": 1 }
  ).lean();

  if (!form || !form.fields || form.fields.length === 0) return null;
  return form.fields[0] as unknown as IFormField;
};

export const deleteField = async (formId: string, fieldId: string): Promise<IFormField | null> => {
  await Form.updateOne(
    { _id: formId },
    { $pull: { fields: { _id: new mongoose.Types.ObjectId(fieldId) } } }
  );

  return null; // Deleted field is no longer available
};

export const getMaxOrder = async (formId: string): Promise<number> => {
  const form = await Form.findById(formId)
    .select("fields")
    .lean();

  if (!form || !form.fields || form.fields.length === 0) return 0;
  const maxField = form.fields.reduce((max: any, f: any) =>
    f.order > max.order ? f : max
  );
  return maxField ? maxField.order : 0;
};

export const updateFieldOrders = async (
  updates: { fieldId: string; order: number }[]
): Promise<void> => {
  for (const update of updates) {
    const filter = buildFieldFilter(update.fieldId);
    await Form.updateOne(filter, {
      $set: { "fields.$.order": update.order },
    });
  }
};