import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { nanoid } from "nanoid";
import * as pageRepo from "./page.repository";
import { buildPageSettings } from "./page.settings";
import { displayOnlyPageTypes, PageType } from "../../constants/pageTypes";
import {
  CreatePageBody,
  UpdatePageBody,
  ReorderPagesBody,
  PageLogicBody,
} from "./page.types";

/** Statement pages are display-only, so they can never be "required". */
const resolveRequired = (type: string, required?: boolean): boolean =>
  displayOnlyPageTypes.includes(type as PageType) ? false : Boolean(required);

export const createPage = async (
  formId: string,
  data: CreatePageBody
): Promise<any> => {
  const order = (await pageRepo.getMaxOrder(formId)) + 1;
  const pageKey = `page_${nanoid(8)}`;

  const pageType = data.type || "statement";
  const title = data.title !== undefined ? data.title : (data.label || "");
  const description = data.description !== undefined ? data.description : (data.helperText || "");
  const label = data.label !== undefined ? data.label : title;
  const helperText = data.helperText !== undefined ? data.helperText : description;

  let blocks = data.blocks;
  if (!blocks || blocks.length === 0) {
    if (data.type) {
      const blockId = new mongoose.Types.ObjectId();
      const blockKey = `block_${nanoid(8)}`;
      blocks = [
        {
          _id: blockId,
          blockKey,
          questionKey: blockKey,
          title: "",
          description: "",
          label: "",
          helperText: "",
          placeholder: data.placeholder || "",
          type: data.type,
          required: resolveRequired(data.type, data.required),
          order: 1,
          coverImage: data.coverImage || undefined,
          options: data.options || [],
          validation: data.validation || {},
          settings: buildPageSettings(data.type, data.settings),
          appearance: data.appearance || { width: "full", icon: "", submitButtonText: "", submitButtonColor: "" },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    } else {
      blocks = [];
    }
  }

  const result = await pageRepo.createPage({
    formId,
    pageKey,
    title,
    description,
    label,
    helperText,
    type: pageType,
    order,
    placeholder: data.placeholder || "",
    required: resolveRequired(pageType, data.required),
    coverImage: data.coverImage || undefined,
    options: data.options || [],
    validation: data.validation || {},
    settings: buildPageSettings(pageType, data.settings),
    appearance: data.appearance || { width: "full", icon: "", submitButtonText: "", submitButtonColor: "" },
    blocks,
  });

  const pageObj = typeof (result.page as any)?.toObject === "function" ? (result.page as any).toObject() : result.page;
  const id = pageObj._id?.toString() || pageObj.id;
  const pageWithId = { ...pageObj, id, _id: pageObj._id };
  return {
    ...pageWithId,
    page: pageWithId,
    hasUnpublishedChanges: result.hasUnpublishedChanges,
  };
};

export const getPagesByFormId = async (formId: string): Promise<any[]> => {
  return pageRepo.findPagesByFormId(formId);
};

export const getPageById = async (
  formId: string,
  pageId: string
): Promise<any> => {
  const page = await pageRepo.findPageById(formId, pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }
  return page;
};

export const updatePage = async (
  formId: string,
  pageId: string,
  data: UpdatePageBody
): Promise<any> => {
  const page = await pageRepo.findPageById(formId, pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }

  const payload: Record<string, any> = { ...data };
  const nextType = data.type || page.type || "statement";

  // Re-derive settings whenever the type changes or new settings arrive, so a
  // page never keeps settings belonging to its previous type.
  if (data.settings !== undefined || (data.type && data.type !== page.type)) {
    payload.settings = buildPageSettings(nextType, data.settings ?? page.settings);
  }

  if (data.required !== undefined || data.type) {
    payload.required = resolveRequired(nextType, data.required ?? page.required);
  }

  // Explicit null clears the cover image.
  if (data.coverImage === null) {
    payload.coverImage = undefined;
  }

  const result = await pageRepo.updatePage(formId, pageId, payload);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }
  const pageObj = typeof (result.page as any)?.toObject === "function" ? (result.page as any).toObject() : result.page;
  const id = pageObj._id?.toString() || pageObj.id;
  const pageWithId = { ...pageObj, id, _id: pageObj._id };
  return {
    ...pageWithId,
    page: pageWithId,
    hasUnpublishedChanges: result.hasUnpublishedChanges,
  };
};

export const deletePage = async (
  formId: string,
  pageId: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const page = await pageRepo.findPageById(formId, pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }
  return pageRepo.deletePage(formId, pageId);
};

export const reorderPages = async (
  formId: string,
  data: ReorderPagesBody
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const updates = data.pageIds.map((pageId, index) => ({
    pageId,
    order: index + 1,
  }));
  return pageRepo.updatePageOrders(formId, updates);
};

export const duplicatePage = async (
  formId: string,
  pageId: string
): Promise<any> => {
  const page = await pageRepo.findPageById(formId, pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }

  const order = (await pageRepo.getMaxOrder(formId)) + 1;
  const pageKey = `page_${nanoid(8)}`;
  const pageType = page.type || "statement";
  const label = page.label || page.title || "";
  const title = page.title || page.label || "";
  const helperText = page.helperText || page.description || "";
  const description = page.description || page.helperText || "";

  const result = await pageRepo.createPage({
    formId,
    pageKey,
    title: `${title} (copy)`,
    description,
    label: `${label} (copy)`,
    type: pageType,
    order,
    helperText,
    placeholder: page.placeholder,
    required: page.required,
    coverImage: page.coverImage ? { ...page.coverImage } : undefined,
    options: page.options,
    validation: page.validation,
    settings: buildPageSettings(pageType, page.settings),
    appearance: {
      ...(page.appearance || {}),
      submitButtonText: page.appearance?.submitButtonText || "",
      submitButtonColor: page.appearance?.submitButtonColor || "",
    },
    blocks: (page.blocks || []).map((b: any) => ({
      ...b,
      _id: new mongoose.Types.ObjectId(),
      blockKey: `block_${nanoid(8)}`,
    })),
  });

  const pageObj = typeof (result.page as any)?.toObject === "function" ? (result.page as any).toObject() : result.page;
  const id = pageObj._id?.toString() || pageObj.id;
  const pageWithId = { ...pageObj, id, _id: pageObj._id };
  return {
    ...pageWithId,
    page: pageWithId,
    hasUnpublishedChanges: result.hasUnpublishedChanges,
  };
};

export const updatePageLogic = async (
  formId: string,
  pageId: string,
  data: PageLogicBody
): Promise<any> => {
  const page = await pageRepo.findPageById(formId, pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }

  const result = await pageRepo.updatePage(formId, pageId, { logic: data.logic });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }
  return { page: result.page, hasUnpublishedChanges: result.hasUnpublishedChanges };
};

export const deletePageLogic = async (
  formId: string,
  pageId: string
): Promise<any> => {
  const page = await pageRepo.findPageById(formId, pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }

  const result = await pageRepo.updatePage(formId, pageId, { logic: [] });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }
  return { page: result.page, hasUnpublishedChanges: result.hasUnpublishedChanges };
};
