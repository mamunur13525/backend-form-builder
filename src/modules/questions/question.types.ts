import { PageType } from "../../constants/pageTypes";
import { ICoverImage, IPageOption, IPageSettings, IFormBlock } from "../../models/Form";
import { PageValidationBody, PageAppearanceBody } from "../pages/page.types";

export interface CreateBlockBody {
  pageId?: string;
  type: PageType;
  title?: string;
  description?: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  coverImage?: ICoverImage | null;
  options?: IPageOption[];
  validation?: PageValidationBody;
  settings?: IPageSettings;
  appearance?: PageAppearanceBody;
}

export type CreateQuestionBody = CreateBlockBody;

export interface UpdateBlockBody {
  type?: PageType;
  title?: string;
  description?: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  coverImage?: ICoverImage | null;
  options?: IPageOption[];
  validation?: PageValidationBody;
  settings?: IPageSettings;
  appearance?: PageAppearanceBody;
}

export type UpdateQuestionBody = UpdateBlockBody;

export interface ReorderBlocksBody {
  pageId?: string;
  blockIds?: string[];
  questionIds?: string[];
}

export type ReorderQuestionsBody = ReorderBlocksBody;