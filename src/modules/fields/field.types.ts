import { FieldType } from "../../constants/fieldTypes";
import { ICoverImage, IFieldOption, IFieldSettings } from "../../models/Form";

export interface FieldValidationBody {
  minLength?: number | null;
  maxLength?: number | null;
  min?: number | null;
  max?: number | null;
  pattern?: string;
  message?: string;
}

export interface FieldAppearanceBody {
  width?: "full" | "half";
  icon?: string;
  submitButtonText?: string;
  submitButtonColor?: string;
}

export interface CreateFieldBody {
  type: FieldType;
  label: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  coverImage?: ICoverImage | null;
  options?: IFieldOption[];
  validation?: FieldValidationBody;
  settings?: IFieldSettings;
  appearance?: FieldAppearanceBody;
}

export interface UpdateFieldBody {
  type?: FieldType;
  label?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  coverImage?: ICoverImage | null;
  options?: IFieldOption[];
  validation?: FieldValidationBody;
  settings?: IFieldSettings;
  appearance?: FieldAppearanceBody;
}

export interface ReorderFieldsBody {
  fieldIds: string[];
}

export interface FieldLogicBody {
  logic: {
    whenFieldKey?: string;
    operator?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value?: any;
    action?: "show" | "hide" | "goToField" | "goToEnd";
    targetFieldKey?: string;
  }[];
}
