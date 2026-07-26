export interface CreateLogicBody {
  conditions: {
    fieldKey: string;
    operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value: any;
  }[];
  actions: {
    action: "show" | "hide" | "goToField" | "goToEnd" | "skipTo";
    target?: string;
  }[];
}

export interface UpdateLogicBody {
  conditions?: {
    fieldKey: string;
    operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value: any;
  }[];
  actions?: {
    action: "show" | "hide" | "goToField" | "goToEnd" | "skipTo";
    target?: string;
  }[];
}