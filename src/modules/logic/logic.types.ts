import type {
  LogicActionType,
  LogicCategory,
  LogicCombinator,
  LogicOperator,
  LogicSourceType,
} from "../../constants/pageTypes";

export interface LogicConditionBody {
  sourceType?: LogicSourceType;
  /** Page key or variable name the condition reads from. */
  sourceKey: string;
  operator: LogicOperator;
  value?: any;
  /** Joins this condition to the PREVIOUS one; the first condition has none. */
  combinator?: LogicCombinator;
}

export interface LogicActionBody {
  action: LogicActionType;
  /** showPage / hidePage / jumpToPage target. */
  targetPageKey?: string;
  /** setVariable target. */
  variableName?: string;
  /** Arithmetic expression for calculation rules (`@pageKey + @variable`). */
  expression?: string;
  /** Static value for calculation rules without an expression. */
  value?: any;
}

export interface CreateLogicBody {
  category?: LogicCategory;
  name?: string;
  enabled?: boolean;
  combinator?: LogicCombinator;
  conditions: LogicConditionBody[];
  actions: LogicActionBody[];
  order?: number;
}

export interface UpdateLogicBody {
  category?: LogicCategory;
  name?: string;
  enabled?: boolean;
  combinator?: LogicCombinator;
  conditions?: LogicConditionBody[];
  actions?: LogicActionBody[];
  order?: number;
}

/** Replace-all payload: the full set of rules for a form. */
export interface ReplaceAllLogicBody {
  rules: CreateLogicBody[];
}
