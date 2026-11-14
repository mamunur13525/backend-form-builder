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
  title?: string;
  description?: string;
  label?: string;
  type?: string;
  order: number;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  coverImage?: any;
  options?: { label?: string; value?: string }[];
  validation?: any;
  settings?: any;
  appearance?: any;
  blocks?: any[];
}): Promise<{ page: IFormPage; hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(data.formId);

  const title = data.title !== undefined ? data.title : (data.label || "");
  const description = data.description !== undefined ? data.description : (data.helperText || "");
  const label = data.label !== undefined ? data.label : title;
  const helperText = data.helperText !== undefined ? data.helperText : description;

  const pageId = new mongoose.Types.ObjectId();
  const page: any = {
    _id: pageId,
    pageKey: data.pageKey,
    title,
    description,
    label,
    helperText,
    type: data.type || "statement",
    order: data.order,
    placeholder: data.placeholder || "",
    required: data.required || false,
    coverImage: data.coverImage || undefined,
    options: data.options || [],
    validation: data.validation || {},
    settings: data.settings || {},
    appearance: data.appearance || { width: "full", icon: "", submitButtonText: "", submitButtonColor: "" },
    blocks: data.blocks || [],
    questions: data.blocks || [],
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
  return (draftVersion.formSchema.pages || [])
    .filter((f: any) => f.isActive)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .map((p: any) => {
      const pageObj = typeof p?.toObject === "function" ? p.toObject() : { ...p };
      const rawBlocks = pageObj.blocks || pageObj.questions || [];
      const sortedBlocks = [...rawBlocks].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      pageObj.blocks = sortedBlocks;
      pageObj.questions = sortedBlocks;
      return pageObj;
    }) as unknown as IFormPage[];
};

export const findPageById = async (
  formId: string,
  pageId: string
): Promise<IFormPage | null> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  const filter = buildPageFilter(pageId);
  const found = pages.find((f: any) => {
    const strId = f._id?.toString() || f.id?.toString() || "";
    const key = f.pageKey || "";
    return (
      strId === pageId ||
      key === pageId ||
      (filter._id && strId === filter._id.toString()) ||
      key === filter.pageKey
    );
  });

  if (!found) return null;
  const pageObj = typeof (found as any)?.toObject === "function" ? (found as any).toObject() : { ...found };
  const rawBlocks = pageObj.blocks || pageObj.questions || [];
  const sortedBlocks = [...rawBlocks].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  pageObj.blocks = sortedBlocks;
  pageObj.questions = sortedBlocks;
  return pageObj as unknown as IFormPage;
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
    const strId = f._id?.toString() || f.id?.toString() || "";
    const key = f.pageKey || "";
    return (
      strId === pageId ||
      key === pageId ||
      (filter._id && strId === filter._id.toString()) ||
      key === filter.pageKey
    );
  });

  if (index === -1) return null;

  const targetPage = pages[index];
  if (data.title !== undefined && data.label === undefined) {
    data.label = data.title;
  }
  if (data.label !== undefined && data.title === undefined) {
    data.title = data.label;
  }
  if (data.description !== undefined && data.helperText === undefined) {
    data.helperText = data.description;
  }
  if (data.helperText !== undefined && data.description === undefined) {
    data.description = data.helperText;
  }

  if (data.blocks !== undefined || data.questions !== undefined) {
    const rawItems = data.blocks !== undefined ? data.blocks : data.questions;
    const sortedItems = Array.isArray(rawItems)
      ? [...rawItems].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      : [];
    targetPage.blocks = sortedItems;
    targetPage.questions = sortedItems;
    data.blocks = sortedItems;
    data.questions = sortedItems;
  }

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

  const pageMap = new Map<string, any>();
  for (const page of pages) {
    if (page._id) pageMap.set(page._id.toString(), page);
    if ((page as any).id) pageMap.set((page as any).id.toString(), page);
    if (page.pageKey) pageMap.set(page.pageKey, page);
  }

  const reordered: any[] = [];
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    const target =
      pageMap.get(update.pageId) ||
      pages.find((f: any) => {
        const strId = f._id?.toString() || f.id?.toString() || "";
        const key = f.pageKey || "";
        return strId === update.pageId || key === update.pageId;
      });
    if (target && !reordered.includes(target)) {
      target.order = i + 1;
      target.updatedAt = new Date();
      reordered.push(target);
    }
  }

  // Append remaining pages that were not in updates
  for (const page of pages) {
    if (!reordered.includes(page)) {
      page.order = reordered.length + 1;
      reordered.push(page);
    }
  }

  draftVersion.formSchema.pages = reordered;
  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.pages = reordered as any;
  await form.save();

  return { hasUnpublishedChanges: form.hasUnpublishedChanges };
};
