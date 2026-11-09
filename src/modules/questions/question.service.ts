import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import * as questionRepo from "./question.repository";
import { buildPageSettings } from "../pages/page.settings";
import { displayOnlyPageTypes, PageType } from "../../constants/pageTypes";
import {
  CreateQuestionBody,
  UpdateQuestionBody,
  ReorderQuestionsBody,
} from "./question.types";

const resolveRequired = (type: string, required?: boolean): boolean =>
  displayOnlyPageTypes.includes(type as PageType) ? false : Boolean(required);

export const createQuestion = async (
  formId: string,
  data: CreateQuestionBody,
  pageIdParam?: string
): Promise<any> => {
  const pageId = pageIdParam || data.pageId;
  const questionType = data.type || "shortText";

  const result = await questionRepo.createBlock(formId, {
    ...data,
    pageId,
    type: questionType,
    required: resolveRequired(questionType, data.required),
    settings: buildPageSettings(questionType, data.settings),
  });

  return {
    question: result.block,
    block: result.block,
    page: result.page,
    hasUnpublishedChanges: result.hasUnpublishedChanges,
  };
};

export const getQuestions = async (
  formId: string,
  pageId?: string
): Promise<any[]> => {
  return questionRepo.findBlocks(formId, pageId);
};

export const getQuestionById = async (
  formId: string,
  questionId: string,
  pageId?: string
): Promise<any> => {
  const found = await questionRepo.findBlockById(formId, questionId, pageId);
  if (!found) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found");
  }
  return found.block;
};

export const updateQuestion = async (
  formId: string,
  questionId: string,
  data: UpdateQuestionBody,
  pageId?: string
): Promise<any> => {
  const found = await questionRepo.findBlockById(formId, questionId, pageId);
  if (!found) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found");
  }

  const existingBlock = found.block;
  const payload: Record<string, any> = { ...data };
  const nextType = data.type || existingBlock.type;

  if (data.settings !== undefined || (data.type && data.type !== existingBlock.type)) {
    payload.settings = buildPageSettings(nextType, data.settings ?? existingBlock.settings);
  }

  if (data.required !== undefined || data.type) {
    payload.required = resolveRequired(nextType, data.required ?? existingBlock.required);
  }

  if (data.coverImage === null) {
    payload.coverImage = undefined;
  }

  const result = await questionRepo.updateBlock(formId, questionId, payload, pageId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found");
  }

  return {
    question: result.block,
    block: result.block,
    hasUnpublishedChanges: result.hasUnpublishedChanges,
  };
};

export const deleteQuestion = async (
  formId: string,
  questionId: string,
  pageId?: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const found = await questionRepo.findBlockById(formId, questionId, pageId);
  if (!found) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found");
  }

  return questionRepo.deleteBlock(formId, questionId, pageId);
};

export const reorderQuestions = async (
  formId: string,
  data: ReorderQuestionsBody,
  pageIdParam?: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const pageId = pageIdParam || data.pageId;
  const ids = data.questionIds || data.blockIds || [];
  return questionRepo.reorderBlocks(formId, ids, pageId);
};

// Backwards compatibility aliases
export const createBlock = createQuestion;
export const getBlocks = getQuestions;
export const getBlockById = getQuestionById;
export const updateBlock = updateQuestion;
export const deleteBlock = deleteQuestion;
export const reorderBlocks = reorderQuestions;