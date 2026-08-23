import mongoose from "mongoose";
import { Form, IEndPage } from "../../models/Form";
import { FormVersion } from "../../models/FormVersion";
import { ensureDraftVersion } from "../forms/version.helper";
import { buildDefaultEndPageContent } from "../../constants/endPage";

const buildEndPageFilter = (endPageId: string): Record<string, any> => {
  if (mongoose.Types.ObjectId.isValid(endPageId)) {
    return { _id: new mongoose.Types.ObjectId(endPageId) };
  }
  return { key: endPageId };
};

export const getDraftVersionForForm = async (formId: string) => {
  const form = await Form.findById(formId);
  if (!form) {
    throw new Error("Form not found");
  }
  const draftVersion = await ensureDraftVersion(form);
  return { form, draftVersion };
};

export const createEndPage = async (data: {
  formId: string;
  key: string;
  title?: string;
  helperText?: string;
  paragraph?: string;
  coverImage?: any;
  embed?: any;
  alignment?: any;
  button?: any;
  redirect?: any;
  showConfetti?: boolean;
  socialShareButtons?: boolean;
  socialShareMessage?: string;
  socialShareMedia?: any;
  order: number;
}): Promise<{ endPage: IEndPage; hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(data.formId);

  const endPageId = new mongoose.Types.ObjectId();
  const defaultContent = buildDefaultEndPageContent();
  const endPage: any = {
    _id: endPageId,
    key: data.key,
    title: data.title || defaultContent.title,
    helperText: data.helperText || data.paragraph || defaultContent.helperText,
    paragraph: data.paragraph || data.helperText || defaultContent.paragraph,
    coverImage: data.coverImage || undefined,
    embed: data.embed || { url: "" },
    alignment: data.alignment || "left",
    button: data.button || defaultContent.button,
    redirect: data.redirect || { isRedirect: false, link: "" },
    showConfetti: Boolean(data.showConfetti),
    socialShareButtons: Boolean(data.socialShareButtons),
    socialShareMessage: data.socialShareMessage || "",
    socialShareMedia: data.socialShareMedia || {
      facebook: false,
      twitter: false,
      linkedin: false,
      whatsapp: false,
    },
    order: data.order,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!draftVersion.formSchema.endPages) {
    draftVersion.formSchema.endPages = [];
  }

  draftVersion.formSchema.endPages.push(endPage);
  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.endPages = draftVersion.formSchema.endPages as any;
  await form.save();

  return { endPage: endPage as IEndPage, hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const findEndPagesByFormId = async (formId: string): Promise<IEndPage[]> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  return (draftVersion.formSchema.endPages || []) as unknown as IEndPage[];
};

export const findEndPageById = async (
  formId: string,
  endPageId: string
): Promise<IEndPage | null> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const endPages = draftVersion.formSchema.endPages || [];

  const filter = buildEndPageFilter(endPageId);
  const found = endPages.find((ep: any) => {
    if (filter._id) {
      return ep._id && ep._id.toString() === filter._id.toString();
    }
    return ep.key === filter.key;
  });

  return (found as unknown as IEndPage) || null;
};

export const updateEndPage = async (
  formId: string,
  endPageId: string,
  data: Record<string, any>
): Promise<{ endPage: IEndPage; hasUnpublishedChanges: boolean } | null> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const endPages = draftVersion.formSchema.endPages || [];
  const filter = buildEndPageFilter(endPageId);

  const index = endPages.findIndex((ep: any) => {
    if (filter._id) {
      return ep._id && ep._id.toString() === filter._id.toString();
    }
    return ep.key === filter.key;
  });

  if (index === -1) return null;

  const targetEndPage = endPages[index];

  // If helperText or paragraph was updated, keep them in sync if only one was provided
  if (data.helperText !== undefined && data.paragraph === undefined) {
    data.paragraph = data.helperText;
  } else if (data.paragraph !== undefined && data.helperText === undefined) {
    data.helperText = data.paragraph;
  }

  // Nested object merge for button, redirect, embed, socialShareMedia
  if (data.button && typeof data.button === "object") {
    data.button = { ...(targetEndPage.button || {}), ...data.button };
  }
  if (data.redirect && typeof data.redirect === "object") {
    data.redirect = { ...(targetEndPage.redirect || {}), ...data.redirect };
  }
  if (data.embed && typeof data.embed === "object") {
    data.embed = { ...(targetEndPage.embed || {}), ...data.embed };
  }
  if (data.socialShareMedia && typeof data.socialShareMedia === "object") {
    data.socialShareMedia = { ...(targetEndPage.socialShareMedia || {}), ...data.socialShareMedia };
  }

  Object.assign(targetEndPage, data, { updatedAt: new Date() });

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.endPages = draftVersion.formSchema.endPages as any;
  await form.save();

  return { endPage: targetEndPage as unknown as IEndPage, hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const deleteEndPage = async (formId: string, endPageId: string): Promise<{ hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const filter = buildEndPageFilter(endPageId);

  draftVersion.formSchema.endPages = (draftVersion.formSchema.endPages || []).filter((ep: any) => {
    if (filter._id) {
      return !ep._id || ep._id.toString() !== filter._id.toString();
    }
    return ep.key !== filter.key;
  });

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.endPages = draftVersion.formSchema.endPages as any;
  await form.save();

  return { hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const reorderEndPages = async (
  formId: string,
  orderedEndPageIds: string[]
): Promise<{ endPages: IEndPage[]; hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const endPages = draftVersion.formSchema.endPages || [];

  const endPageMap = new Map<string, any>();
  endPages.forEach((ep: any) => {
    if (ep._id) endPageMap.set(ep._id.toString(), ep);
    if (ep.key) endPageMap.set(ep.key, ep);
  });

  const reordered: any[] = [];
  orderedEndPageIds.forEach((id, index) => {
    const ep = endPageMap.get(id);
    if (ep) {
      ep.order = index + 1;
      ep.updatedAt = new Date();
      reordered.push(ep);
      if (ep._id) endPageMap.delete(ep._id.toString());
      if (ep.key) endPageMap.delete(ep.key);
    }
  });

  // Append remaining end pages that weren't mentioned in orderedEndPageIds
  endPageMap.forEach((ep) => {
    if (!reordered.includes(ep)) {
      ep.order = reordered.length + 1;
      reordered.push(ep);
    }
  });

  draftVersion.formSchema.endPages = reordered;
  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.endPages = reordered as any;
  await form.save();

  return { endPages: reordered as unknown as IEndPage[], hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const getMaxOrder = async (formId: string): Promise<number> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const endPages = draftVersion.formSchema.endPages || [];
  if (endPages.length === 0) return 0;
  return Math.max(...endPages.map((ep: any) => ep.order || 0));
};
