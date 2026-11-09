import mongoose from "mongoose";
import { Form, IFormBlock, IFormPage } from "../../models/Form";
import { FormVersion } from "../../models/FormVersion";
import { ensureDraftVersion } from "../forms/version.helper";
import { nanoid } from "nanoid";

const buildLookupFilter = (id: string): Record<string, any> => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: new mongoose.Types.ObjectId(id) };
  }
  return { key: id };
};

const getDraftVersionForForm = async (formId: string) => {
  const form = await Form.findById(formId);
  if (!form) {
    throw new Error("Form not found");
  }
  const draftVersion = await ensureDraftVersion(form);
  return { form, draftVersion };
};

const findPageInPages = (pages: any[], pageId?: string): any => {
  if (!pages || pages.length === 0) return null;
  if (!pageId || pageId === "undefined") return pages[0];

  const filter = buildLookupFilter(pageId);
  return pages.find((p: any) => {
    if (filter._id) {
      return p._id && p._id.toString() === filter._id.toString();
    }
    return p.pageKey === filter.key;
  });
};

export const createBlock = async (
  formId: string,
  data: {
    pageId?: string;
    type: string;
    title?: string;
    description?: string;
    label?: string;
    helperText?: string;
    placeholder?: string;
    required?: boolean;
    coverImage?: any;
    options?: { label?: string; value?: string }[];
    validation?: any;
    settings?: any;
    appearance?: any;
  }
): Promise<{ block: IFormBlock; page: IFormPage; hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  let page = findPageInPages(pages, data.pageId);
  if (!page) {
    // If no page exists at all, create a default page container
    const newPageId = new mongoose.Types.ObjectId();
    page = {
      _id: newPageId,
      pageKey: `page_${nanoid(8)}`,
      title: "",
      description: "",
      label: "",
      helperText: "",
      type: "statement",
      order: 1,
      placeholder: "",
      required: false,
      options: [],
      validation: {},
      settings: {},
      appearance: { width: "full", icon: "", submitButtonText: "", submitButtonColor: "" },
      blocks: [],
      isActive: true,
      logic: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pages.push(page);
  }

  if (!page.blocks) {
    page.blocks = [];
  }

  const blockId = new mongoose.Types.ObjectId();
  const blockKey = `block_${nanoid(8)}`;
  const title = data.title !== undefined ? data.title : (data.label || "");
  const description = data.description !== undefined ? data.description : (data.helperText || "");
  const label = data.label !== undefined ? data.label : title;
  const helperText = data.helperText !== undefined ? data.helperText : description;

  const maxOrder = page.blocks.reduce(
    (max: number, b: any) => (b.order > max ? b.order : max),
    0
  );
  const order = maxOrder + 1;

  const block: any = {
    _id: blockId,
    id: blockId.toString(),
    blockKey,
    title,
    description,
    label,
    helperText,
    type: data.type || "shortText",
    order,
    placeholder: data.placeholder || "",
    required: data.required || false,
    coverImage: data.coverImage || undefined,
    options: data.options || [],
    validation: data.validation || {},
    settings: data.settings || {},
    appearance: data.appearance || {
      width: "full",
      icon: "",
      submitButtonText: "",
      submitButtonColor: "",
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  page.blocks.push(block);

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  form.pages = draftVersion.formSchema.pages as any;
  await form.save();

  return {
    block: block as IFormBlock,
    page: page as IFormPage,
    hasUnpublishedChanges: form.hasUnpublishedChanges,
  };
};

export const findBlocks = async (
  formId: string,
  pageId?: string
): Promise<IFormBlock[]> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  if (pageId && pageId !== "undefined") {
    const page = findPageInPages(pages, pageId);
    if (!page) return [];
    return (page.blocks || [])
      .filter((b: any) => b.isActive !== false)
      .sort((a: any, b: any) => a.order - b.order) as IFormBlock[];
  }

  // If no pageId specified, collect all blocks across all active pages
  const allBlocks: IFormBlock[] = [];
  for (const page of pages) {
    if (page.isActive !== false && Array.isArray(page.blocks)) {
      allBlocks.push(
        ...page.blocks.filter((b: any) => b.isActive !== false)
      );
    }
  }
  return allBlocks.sort((a: any, b: any) => a.order - b.order);
};

export const findBlockById = async (
  formId: string,
  blockId: string,
  pageId?: string
): Promise<{ page: any; block: IFormBlock } | null> => {
  const { draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  const filter = buildLookupFilter(blockId);

  const targetPage = pageId && pageId !== "undefined" ? findPageInPages(pages, pageId) : null;
  const searchPages = targetPage ? [targetPage, ...pages.filter((p: any) => p !== targetPage)] : pages;

  for (const page of searchPages) {
    const blocks = page.blocks || [];
    const found = blocks.find((b: any) => {
      if (filter._id) {
        return b._id && b._id.toString() === filter._id.toString();
      }
      return b.blockKey === filter.key;
    });

    if (found) {
      if (found._id && !found.id) found.id = found._id.toString();
      return { page, block: found as IFormBlock };
    }
  }

  return null;
};

export const updateBlock = async (
  formId: string,
  blockId: string,
  data: Record<string, any>,
  pageId?: string
): Promise<{ block: IFormBlock; hasUnpublishedChanges: boolean } | null> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  const filter = buildLookupFilter(blockId);
  const targetPage = pageId && pageId !== "undefined" ? findPageInPages(pages, pageId) : null;
  const searchPages = targetPage ? [targetPage, ...pages.filter((p: any) => p !== targetPage)] : pages;

  for (const page of searchPages) {
    const blocks = page.blocks || [];
    const block = blocks.find((b: any) => {
      if (filter._id) {
        return b._id && b._id.toString() === filter._id.toString();
      }
      return b.blockKey === filter.key;
    });

    if (block) {
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

      Object.assign(block, data, { updatedAt: new Date() });
      if (block._id && !block.id) block.id = block._id.toString();

      draftVersion.markModified("formSchema");
      await draftVersion.save();

      if (form.publishedVersionId) {
        form.hasUnpublishedChanges = true;
      }
      form.pages = draftVersion.formSchema.pages as any;
      await form.save();

      return {
        block: block as IFormBlock,
        hasUnpublishedChanges: form.hasUnpublishedChanges,
      };
    }
  }

  return null;
};

export const deleteBlock = async (
  formId: string,
  blockId: string,
  pageId?: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  const filter = buildLookupFilter(blockId);
  const targetPage = pageId && pageId !== "undefined" ? findPageInPages(pages, pageId) : null;
  const searchPages = targetPage ? [targetPage, ...pages.filter((p: any) => p !== targetPage)] : pages;

  for (const page of searchPages) {
    const initialLength = (page.blocks || []).length;
    page.blocks = (page.blocks || []).filter((b: any) => {
      if (filter._id) {
        return !b._id || b._id.toString() !== filter._id.toString();
      }
      return b.blockKey !== filter.key;
    });

    if (page.blocks.length !== initialLength) {
      draftVersion.markModified("formSchema");
      await draftVersion.save();

      if (form.publishedVersionId) {
        form.hasUnpublishedChanges = true;
      }
      form.pages = draftVersion.formSchema.pages as any;
      await form.save();

      return { hasUnpublishedChanges: form.hasUnpublishedChanges };
    }
  }

  return { hasUnpublishedChanges: form.hasUnpublishedChanges };
};

export const reorderBlocks = async (
  formId: string,
  blockIds: string[],
  pageId?: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const { form, draftVersion } = await getDraftVersionForForm(formId);
  const pages = draftVersion.formSchema.pages || [];

  const targetPage = pageId && pageId !== "undefined" ? findPageInPages(pages, pageId) : null;
  const searchPages = targetPage ? [targetPage, ...pages.filter((p: any) => p !== targetPage)] : pages;

  for (const page of searchPages) {
    const blocks = page.blocks || [];
    let updatedAny = false;

    blockIds.forEach((id, index) => {
      const filter = buildLookupFilter(id);
      const target = blocks.find((b: any) => {
        if (filter._id) {
          return b._id && b._id.toString() === filter._id.toString();
        }
        return b.blockKey === filter.key;
      });
      if (target) {
        target.order = index + 1;
        updatedAny = true;
      }
    });

    if (updatedAny) {
      page.blocks.sort((a: any, b: any) => a.order - b.order);
      draftVersion.markModified("formSchema");
      await draftVersion.save();

      if (form.publishedVersionId) {
        form.hasUnpublishedChanges = true;
      }
      form.pages = draftVersion.formSchema.pages as any;
      await form.save();

      return { hasUnpublishedChanges: form.hasUnpublishedChanges };
    }
  }

  return { hasUnpublishedChanges: form.hasUnpublishedChanges };
};