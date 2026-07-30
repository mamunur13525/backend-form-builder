export interface CreateFieldBody {
  type: string;
  label: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  options?: { label?: string; value?: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  appearance?: {
    width?: "full" | "half";
    icon?: string;
    submitButtonText?: string;
    submitButtonColor?: string;
  };
}

export interface UpdateFieldBody {
  type?: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  options?: { label?: string; value?: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  appearance?: {
    width?: "full" | "half";
    icon?: string;
    submitButtonText?: string;
    submitButtonColor?: string;
  };
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