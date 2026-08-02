import mongoose from "mongoose";
import { Form, IFormField } from "../../models/Form";
import { FormVersion } from "../../models/FormVersion";
import { ensureDraftVersion } from "../forms/version.helper";

const buildFieldFilter = (fieldId: string): Record<string, any> => {
  if (mongoose.Types.ObjectId.isValid(fieldId)) {
    return { _id: new mongoose.Types.ObjectId(fieldId) };
  }
  return { fieldKey: fieldId };
};

export const getDraftVersionForForm = async (formId: string) => {
  const form = await Form.findById(formId);
  if (!form) {
    throw new Error("Form not found");
  }
  const draftVersion = await ensureDraftVersion(form);
  return { form, draftVersion };
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
  coverImage?: any;
  options?: { label?: string; value?: string }[];
  validation?: any;
  settings?: any;
  appearance?: any;
}): Promise<{ field: IFormField; hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(data.formId);

  const fieldId = new mongoose.Types.ObjectId();
  const field: any = {
    _id: fieldId,
    fieldKey: data.fieldKey,
    label: data.label,
    type: data.type,
    order: data.order,
    helperText: data.helperText || "",
    placeholder: data.placeholder || "",
    required: data.required || false,
    coverImage: data.coverImage || undefined,
    options: data.options || [],
    validation: data.validation || {},
    settings: data.settings || {},
    appearance: data.appearance || { width: "full", icon: "", submitButtonText: "", submitButtonColor: "" },
    isActive: true,
    logic: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  draftVersion.formSchema.fields.push(field);
  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.fields = draftVersion.formSchema.fields as any;
  await form.save();

  return { field: field as IFormField, hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const findFieldsByFormId = async (formId: string): Promise<IFormField[]> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  return (draftVersion.formSchema.fields || []).filter((f: any) => f.isActive) as unknown as IFormField[];
};

export const findFieldById = async (
  formId: string,
  fieldId: string
): Promise<IFormField | null> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const fields = draftVersion.formSchema.fields || [];

  const filter = buildFieldFilter(fieldId);
  const found = fields.find((f: any) => {
    if (filter._id) {
      return f._id && f._id.toString() === filter._id.toString();
    }
    return f.fieldKey === filter.fieldKey;
  });

  return (found as unknown as IFormField) || null;
};

export const updateField = async (
  formId: string,
  fieldId: string,
  data: Record<string, any>
): Promise<{ field: IFormField; hasUnpublishedChanges: boolean } | null> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const fields = draftVersion.formSchema.fields || [];
  const filter = buildFieldFilter(fieldId);

  const index = fields.findIndex((f: any) => {
    if (filter._id) {
      return f._id && f._id.toString() === filter._id.toString();
    }
    return f.fieldKey === filter.fieldKey;
  });

  if (index === -1) return null;

  const targetField = fields[index];
  Object.assign(targetField, data, { updatedAt: new Date() });

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.fields = draftVersion.formSchema.fields as any;
  await form.save();

  return { field: targetField as unknown as IFormField, hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const deleteField = async (formId: string, fieldId: string): Promise<{ hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const filter = buildFieldFilter(fieldId);

  draftVersion.formSchema.fields = (draftVersion.formSchema.fields || []).filter((f: any) => {
    if (filter._id) {
      return !f._id || f._id.toString() !== filter._id.toString();
    }
    return f.fieldKey !== filter.fieldKey;
  });

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.fields = draftVersion.formSchema.fields as any;
  await form.save();

  return { hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const getMaxOrder = async (formId: string): Promise<number> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const fields = draftVersion.formSchema.fields || [];
  if (fields.length === 0) return 0;
  return fields.reduce((max: number, f: any) => (f.order > max ? f.order : max), 0);
};

export const updateFieldOrders = async (
  formId: string,
  updates: { fieldId: string; order: number }[]
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const fields = draftVersion.formSchema.fields || [];

  for (const update of updates) {
    const filter = buildFieldFilter(update.fieldId);
    const target = fields.find((f: any) => {
      if (filter._id) {
        return f._id && f._id.toString() === filter._id.toString();
      }
      return f.fieldKey === filter.fieldKey;
    });
    if (target) {
      target.order = update.order;
    }
  }

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.fields = draftVersion.formSchema.fields as any;
  await form.save();

  return { hasUnpublishedChanges: form.hasUnpublishedChanges };
};
