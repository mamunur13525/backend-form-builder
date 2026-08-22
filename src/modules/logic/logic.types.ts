export interface CreateLogicBody {
  conditions: {
    pageKey: string;
    operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value: any;
  }[];
  actions: {
    action: "show" | "hide" | "goToPage" | "goToEnd" | "skipTo";
    target?: string;
  }[];
}

export interface UpdateLogicBody {
  conditions?: {
    pageKey: string;
    operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value: any;
  }[];
  actions?: {
    action: "show" | "hide" | "goToPage" | "goToEnd" | "skipTo";
    target?: string;
  }[];
}