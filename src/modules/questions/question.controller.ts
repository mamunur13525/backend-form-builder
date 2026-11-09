import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as questionService from "./question.service";

export const createQuestion: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await questionService.createQuestion(
      req.params.formId as string,
      req.body,
      req.params.pageId as string | undefined
    );
    sendSuccess(res, result.question, "Question created successfully", httpStatus.CREATED);
  }
);

export const getQuestions: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const questions = await questionService.getQuestions(
      req.params.formId as string,
      req.params.pageId as string | undefined
    );
    sendSuccess(res, questions, "Questions retrieved successfully");
  }
);

export const getQuestionById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const questionId = (req.params.questionId || req.params.blockId) as string;
    const question = await questionService.getQuestionById(
      req.params.formId as string,
      questionId,
      req.params.pageId as string | undefined
    );
    sendSuccess(res, question, "Question retrieved successfully");
  }
);

export const updateQuestion: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const questionId = (req.params.questionId || req.params.blockId) as string;
    const result = await questionService.updateQuestion(
      req.params.formId as string,
      questionId,
      req.body,
      req.params.pageId as string | undefined
    );
    sendSuccess(res, result.question, "Question updated successfully");
  }
);

export const deleteQuestion: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const questionId = (req.params.questionId || req.params.blockId) as string;
    await questionService.deleteQuestion(
      req.params.formId as string,
      questionId,
      req.params.pageId as string | undefined
    );
    sendSuccess(res, null, "Question deleted successfully");
  }
);

export const reorderQuestions: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await questionService.reorderQuestions(
      req.params.formId as string,
      req.body,
      req.params.pageId as string | undefined
    );
    sendSuccess(res, null, "Questions reordered successfully");
  }
);

// Compatibility aliases
export const createBlock: RequestHandler = createQuestion;
export const getBlocks: RequestHandler = getQuestions;
export const getBlockById: RequestHandler = getQuestionById;
export const updateBlock: RequestHandler = updateQuestion;
export const deleteBlock: RequestHandler = deleteQuestion;
export const reorderBlocks: RequestHandler = reorderQuestions;