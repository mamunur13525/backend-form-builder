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

  const result = await pageRepo.createPage({
    formId,
    pageKey,
    label: data.label,
    type: data.type,
    order,
    helperText: data.helperText || "",
    placeholder: data.placeholder || "",
    required: resolveRequired(data.type, data.required),
    coverImage: data.coverImage || undefined,
    options: data.options || [],
    validation: data.validation || {},
    settings: buildPageSettings(data.type, data.settings),
    appearance: data.appearance || { width: "full", icon: "", submitButtonText: "", submitButtonColor: "" },
  });

  return { page: result.page, hasUnpublishedChanges: result.hasUnpublishedChanges };
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
  const nextType = data.type || page.type;

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
  return { page: result.page, hasUnpublishedChanges: result.hasUnpublishedChanges };
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

  const result = await pageRepo.createPage({
    formId,
    pageKey,
    label: `${page.label} (copy)`,
    type: page.type,
    order,
    helperText: page.helperText,
    placeholder: page.placeholder,
    required: page.required,
    coverImage: page.coverImage ? { ...page.coverImage } : undefined,
    options: page.options,
    validation: page.validation,
    settings: buildPageSettings(page.type, page.settings),
    appearance: {
      ...page.appearance,
      submitButtonText: page.appearance.submitButtonText || "",
      submitButtonColor: page.appearance.submitButtonColor || "",
    },
  });

  return { page: result.page, hasUnpublishedChanges: result.hasUnpublishedChanges };
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
