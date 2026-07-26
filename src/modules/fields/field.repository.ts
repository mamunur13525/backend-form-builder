import { FormField, IFormField } from "../../models/FormField";

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
  return FormField.create(data as any);
};

export const findFieldsByFormId = async (formId: string): Promise<IFormField[]> => {
  return FormField.find({ formId, isActive: true })
    .sort({ order: 1 })
    .lean();
};

export const findFieldById = async (
  formId: string,
  fieldId: string
): Promise<IFormField | null> => {
  return FormField.findOne({ _id: fieldId, formId });
};

export const updateField = async (
  fieldId: string,
  data: Record<string, any>
): Promise<IFormField | null> => {
  return FormField.findByIdAndUpdate(fieldId, data, { new: true });
};

export const deleteField = async (fieldId: string): Promise<IFormField | null> => {
  return FormField.findByIdAndDelete(fieldId);
};

export const getMaxOrder = async (formId: string): Promise<number> => {
  const lastField = await FormField.findOne({ formId })
    .sort({ order: -1 })
    .select("order");
  return lastField ? lastField.order : 0;
};

export const updateFieldOrders = async (
  updates: { fieldId: string; order: number }[]
): Promise<void> => {
  const operations = updates.map((u) => ({
    updateOne: {
      filter: { _id: u.fieldId },
      update: { $set: { order: u.order } },
    },
  }));
  await FormField.bulkWrite(operations);
};