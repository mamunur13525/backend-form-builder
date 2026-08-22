import mongoose from "mongoose";
import { Form, IFormPage } from "../../models/Form";
import { FormVersion } from "../../models/FormVersion";
import { ensureDraftVersion } from "../forms/version.helper";

const buildPageFilter = (pageId: string): Record<string, any> => {
  if (mongoose.Types.ObjectId.isValid(pageId)) {
    return { _id: new mongoose.Types.ObjectId(pageId) };
  }
  return { pageKey: pageId };
};

export const getDraftVersionForForm = async (formId: string) => {
  const form = await Form.findById(formId);
  if (!form) {
    throw new Error("Form not found");
  }
  const draftVersion = await ensureDraftVersion(form);
  return { form, draftVersion };
};

export const createPage = async (data: {
  formId: string;
  pageKey: string;
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
}): Promise<{ page: IFormPage; hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(data.formId);

  const pageId = new mongoose.Types.ObjectId();
  const page: any = {
    _id: pageId,
    pageKey: data.pageKey,
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

  draftVersion.formSchema.pages.push(page);
  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.pages = draftVersion.formSchema.pages as any;
  await form.save();

  return { page: page as IFormPage, hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const findPagesByFormId = async (formId: string): Promise<IFormPage[]> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  return (draftVersion.formSchema.pages || []).filter((f: any) => f.isActive) as unknown as IFormPage[];
};

export const findPageById = async (
  formId: string,
  pageId: string
): Promise<IFormPage | null> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  const filter = buildPageFilter(pageId);
  const found = pages.find((f: any) => {
    if (filter._id) {
      return f._id && f._id.toString() === filter._id.toString();
    }
    return f.pageKey === filter.pageKey;
  });

  return (found as unknown as IFormPage) || null;
};

export const updatePage = async (
  formId: string,
  pageId: string,
  data: Record<string, any>
): Promise<{ page: IFormPage; hasUnpublishedChanges: boolean } | null> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];
  const filter = buildPageFilter(pageId);

  const index = pages.findIndex((f: any) => {
    if (filter._id) {
      return f._id && f._id.toString() === filter._id.toString();
    }
    return f.pageKey === filter.pageKey;
  });

  if (index === -1) return null;

  const targetPage = pages[index];
  Object.assign(targetPage, data, { updatedAt: new Date() });

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.pages = draftVersion.formSchema.pages as any;
  await form.save();

  return { page: targetPage as unknown as IFormPage, hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const deletePage = async (formId: string, pageId: string): Promise<{ hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const filter = buildPageFilter(pageId);

  draftVersion.formSchema.pages = (draftVersion.formSchema.pages || []).filter((f: any) => {
    if (filter._id) {
      return !f._id || f._id.toString() !== filter._id.toString();
    }
    return f.pageKey !== filter.pageKey;
  });

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.pages = draftVersion.formSchema.pages as any;
  await form.save();

  return { hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const getMaxOrder = async (formId: string): Promise<number> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];
  if (pages.length === 0) return 0;
  return pages.reduce((max: number, f: any) => (f.order > max ? f.order : max), 0);
};

export const updatePageOrders = async (
  formId: string,
  updates: { pageId: string; order: number }[]
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  for (const update of updates) {
    const filter = buildPageFilter(update.pageId);
    const target = pages.find((f: any) => {
      if (filter._id) {
        return f._id && f._id.toString() === filter._id.toString();
      }
      return f.pageKey === filter.pageKey;
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
  form.pages = draftVersion.formSchema.pages as any;
  await form.save();

  return { hasUnpublishedChanges: form.hasUnpublishedChanges };
};
