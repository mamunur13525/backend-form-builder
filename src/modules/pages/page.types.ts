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
  type: PageType;
  label: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  coverImage?: ICoverImage | null;
  options?: IPageOption[];
  validation?: PageValidationBody;
  settings?: IPageSettings;
  appearance?: PageAppearanceBody;
}

export interface UpdatePageBody {
  type?: PageType;
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
