import { PageType } from "../../constants/pageTypes";
import { ICoverImage, IPageOption, IPageSettings } from "../../models/Form";

export interface PageValidationBody {
  minLength?: number | null;
  maxLength?: number | null;
  min?: number | null;
  max?: number | null;
  pattern?: string;
  message?: string;
}

export interface PageAppearanceBody {
  width?: "full" | "half";
  icon?: string;
  submitButtonText?: string;
  submitButtonColor?: string;
}

export interface CreatePageBody {
  title?: string;
  description?: string;
  label?: string;
  helperText?: string;
  type?: PageType;
  placeholder?: string;
  required?: boolean;
  coverImage?: ICoverImage | null;
  options?: IPageOption[];
  validation?: PageValidationBody;
  settings?: IPageSettings;
  appearance?: PageAppearanceBody;
  blocks?: any[];
}

export interface UpdatePageBody {
  title?: string;
  description?: string;
  label?: string;
  helperText?: string;
  type?: PageType;
  placeholder?: string;
  required?: boolean;
  coverImage?: ICoverImage | null;
  options?: IPageOption[];
  validation?: PageValidationBody;
  settings?: IPageSettings;
  appearance?: PageAppearanceBody;
  blocks?: any[];
}

export interface ReorderPagesBody {
  pageIds: string[];
}

export interface PageLogicBody {
  logic: {
    whenPageKey?: string;
    operator?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value?: any;
    action?: "show" | "hide" | "goToPage" | "goToEnd";
    targetPageKey?: string;
  }[];
}
