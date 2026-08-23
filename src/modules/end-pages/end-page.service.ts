import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { nanoid } from "nanoid";
import { buildDefaultEndPageContent, DEFAULT_END_PAGE_TITLE } from "../../constants/endPage";
import * as endPageRepo from "./end-page.repository";
import {
  CreateEndPageBody,
  UpdateEndPageBody,
  ReorderEndPagesBody,
} from "./end-page.types";

/**
 * Resolves an end page's text content against the shared defaults.
 *
 * Pure function (no I/O) so it can be unit tested without a database.
 * `helperText` and `paragraph` are kept in sync exactly like the update
 * path does: if only one is supplied, the other mirrors it.
 */
export const resolveEndPageDefaults = (
  data: Partial<CreateEndPageBody>
): {
  title: string;
  helperText: string;
  paragraph: string;
  button: { text: string; link: string };
} => {
  const defaults = buildDefaultEndPageContent();
  return {
    title: data.title || defaults.title,
    helperText: data.helperText || data.paragraph || defaults.helperText,
    paragraph: data.paragraph || data.helperText || defaults.paragraph,
    button: {
      text: data.button?.text || defaults.button.text,
      link: data.button?.link || defaults.button.link,
    },
  };
};

export const createEndPage = async (
  formId: string,
  data: CreateEndPageBody
): Promise<any> => {
  const order = (await endPageRepo.getMaxOrder(formId)) + 1;
  const key = `end_page_${nanoid(8)}`;
  const content = resolveEndPageDefaults(data);

  const result = await endPageRepo.createEndPage({
    formId,
    key,
    title: content.title,
    helperText: content.helperText,
    paragraph: content.paragraph,
    coverImage: data.coverImage || undefined,
    embed: data.embed || { url: "" },
    alignment: data.alignment || "left",
    button: content.button,
    redirect: data.redirect || { isRedirect: false, link: "" },
    showConfetti: data.showConfetti ?? false,
    socialShareButtons: data.socialShareButtons ?? false,
    socialShareMessage: data.socialShareMessage || "",
    socialShareMedia: data.socialShareMedia || {
      facebook: false,
      twitter: false,
      linkedin: false,
      whatsapp: false,
    },
    order,
  });

  return { endPage: result.endPage, hasUnpublishedChanges: result.hasUnpublishedChanges };
};

export const getEndPagesByFormId = async (formId: string): Promise<any[]> => {
  return endPageRepo.findEndPagesByFormId(formId);
};

export const getEndPageById = async (
  formId: string,
  endPageId: string
): Promise<any> => {
  const endPage = await endPageRepo.findEndPageById(formId, endPageId);
  if (!endPage) {
    throw new ApiError(httpStatus.NOT_FOUND, "End page not found");
  }
  return endPage;
};

export const updateEndPage = async (
  formId: string,
  endPageId: string,
  data: UpdateEndPageBody
): Promise<any> => {
  const endPage = await endPageRepo.findEndPageById(formId, endPageId);
  if (!endPage) {
    throw new ApiError(httpStatus.NOT_FOUND, "End page not found");
  }

  const payload: Record<string, any> = { ...data };

  // Explicit null clears cover image
  if (data.coverImage === null) {
    payload.coverImage = undefined;
  }

  const result = await endPageRepo.updateEndPage(formId, endPageId, payload);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "End page not found");
  }
  return { endPage: result.endPage, hasUnpublishedChanges: result.hasUnpublishedChanges };
};

export const deleteEndPage = async (
  formId: string,
  endPageId: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const endPage = await endPageRepo.findEndPageById(formId, endPageId);
  if (!endPage) {
    throw new ApiError(httpStatus.NOT_FOUND, "End page not found");
  }

  return endPageRepo.deleteEndPage(formId, endPageId);
};

export const reorderEndPages = async (
  formId: string,
  data: ReorderEndPagesBody
): Promise<any> => {
  const result = await endPageRepo.reorderEndPages(formId, data.endPageIds);
  return { endPages: result.endPages, hasUnpublishedChanges: result.hasUnpublishedChanges };
};

export const duplicateEndPage = async (
  formId: string,
  endPageId: string
): Promise<any> => {
  const source = await endPageRepo.findEndPageById(formId, endPageId);
  if (!source) {
    throw new ApiError(httpStatus.NOT_FOUND, "End page not found");
  }

  const order = (await endPageRepo.getMaxOrder(formId)) + 1;
  const key = `end_page_${nanoid(8)}`;

  const result = await endPageRepo.createEndPage({
    formId,
    key,
    title: source.title ? `${source.title} (copy)` : DEFAULT_END_PAGE_TITLE,
    helperText: source.helperText,
    paragraph: source.paragraph,
    coverImage: source.coverImage ? JSON.parse(JSON.stringify(source.coverImage)) : undefined,
    embed: source.embed ? JSON.parse(JSON.stringify(source.embed)) : { url: "" },
    alignment: source.alignment,
    button: source.button ? JSON.parse(JSON.stringify(source.button)) : { text: "", link: "" },
    redirect: source.redirect ? JSON.parse(JSON.stringify(source.redirect)) : { isRedirect: false, link: "" },
    showConfetti: source.showConfetti,
    socialShareButtons: source.socialShareButtons,
    socialShareMessage: source.socialShareMessage,
    socialShareMedia: source.socialShareMedia ? JSON.parse(JSON.stringify(source.socialShareMedia)) : undefined,
    order,
  });

  return { endPage: result.endPage, hasUnpublishedChanges: result.hasUnpublishedChanges };
};
