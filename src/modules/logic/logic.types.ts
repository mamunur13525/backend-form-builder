import type {
  LogicActionType,
  LogicCalcOperation,
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
  /**
   * Arithmetic operation for calculation rules. `set` overwrites the target;
   * `add`/`subtract`/`multiply`/`divide` fold `value` onto the running value.
   */
  operation?: LogicCalcOperation;
  /** Legacy arithmetic expression for calculation rules (`@pageKey + @variable`). */
  expression?: string;
  /**
   * Operand for calculation rules: a literal number or a `@number-variable`
   * when `operation` is set; the static value otherwise.
   */
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
