/**
 * Form logic evaluation engine.
 *
 * Pure, framework-free functions that take the pages of a form, the answers
 * collected so far, the variables of the form and its logic rules, and
 * produce:
 *  - which pages are hidden (display / hidePage rules),
 *  - computed variable values (calculation rules),
 *  - the first matching jump per page (branching rules).
 *
 * Shared by the public-form module (submission-time recompute) and reusable
 * in tests; the frontend mirrors the same algorithm in
 * form-builder/src/shared/utils/formLogic.ts.
 */

import { evaluateExpression } from "./calculate";

/** Sentinel jump target meaning "finish the form now". */
export const JUMP_TO_END = "END" as const;

export interface LogicEnginePage {
  pageKey: string;
  type: string;
  options?: { label?: string; value?: string }[];
}

export interface LogicEngineVariable {
  name: string;
  type: "text" | "number";
  value?: any;
}

export interface LogicEngineCondition {
  sourceType?: "page" | "variable";
  /** Page key or variable name the condition reads from. */
  sourceKey?: string;
  /** Legacy alias for `sourceKey` when the source is a page. */
  pageKey?: string;
  operator?: string;
  value?: any;
  /** Joins this condition to the PREVIOUS one; the first condition has none. */
  combinator?: "and" | "or";
}

export interface LogicEngineAction {
  action?:
    | "showPage"
    | "hidePage"
    | "jumpToPage"
    | "goToEnd"
    | "setVariable"
    | "show"
    | "hide"
    | "goToPage"
    | "skipTo";
  targetPageKey?: string;
  /** Legacy alias for `targetPageKey`. */
  target?: string;
  variableName?: string;
  expression?: string;
  value?: any;
}

export interface LogicEngineRule {
  id?: string;
  category?: "display" | "hidePage" | "branching" | "calculation";
  enabled?: boolean;
  combinator?: "and" | "or";
  conditions?: LogicEngineCondition[];
  actions?: LogicEngineAction[];
}

export interface ResolveFormLogicInput {
  pages: LogicEnginePage[];
  /** Answered values keyed by pageKey. */
  answers: Record<string, unknown>;
  variables?: LogicEngineVariable[];
  rules: LogicEngineRule[];
}

export interface ResolveFormLogicResult {
  /** pageKeys currently hidden by display / hidePage rules. */
  hiddenPageKeys: Set<string>;
  /** Computed variable values keyed by variable name. */
  computedVariables: Record<string, number | string>;
  /** First matching jump per page: pageKey → target pageKey or JUMP_TO_END. */
  jumpTargets: Record<string, string>;
}

type EngineContext = {
  answers: Record<string, unknown>;
  variablesByName: Map<string, LogicEngineVariable>;
  /** Computed (calculation) variables, checked before static variables. */
  computedVariables: Record<string, number | string>;
};

/* -------------------------------------------------------------------------- */
/* Value comparison helpers                                                    */
/* -------------------------------------------------------------------------- */

/** Canonical scalar key: trims strings, lowercases for text comparisons. */
const scalarKey = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed.toLowerCase();
  }
  const asString = String(value).trim();
  return asString === "" ? null : asString.toLowerCase();
};

const isPlainNumeric = (
  key: string | number | null,
): key is number | string => {
  if (key === null) return false;
  if (typeof key === "number") return true;
  return key !== "" && Number.isFinite(Number(key));
};

/**
 * Equality that is array-aware (checkbox / multiSelect answers) and tolerant
 * of number-vs-numeric-string comparisons. Text comparison is case-insensitive.
 */
const valuesEqual = (answer: unknown, expected: unknown): boolean => {
  if (Array.isArray(answer) || Array.isArray(expected)) {
    const toSet = (value: unknown): Set<string> => {
      const items = Array.isArray(value) ? value : [value];
      const keys = items
        .map((item) => scalarKey(item))
        .filter((key): key is string | number => key !== null)
        .map((key) => String(key));
      return new Set(keys);
    };
    const setA = toSet(answer);
    const setB = toSet(expected);
    if (setA.size !== setB.size) return false;
    for (const item of setA) {
      if (!setB.has(item)) return false;
    }
    return true;
  }

  const keyA = scalarKey(answer);
  const keyB = scalarKey(expected);
  if (keyA === null || keyB === null) return keyA === keyB;

  // Numeric comparison only when both sides are pure numbers / numeric strings.
  if (isPlainNumeric(keyA) && isPlainNumeric(keyB)) {
    const numA = typeof keyA === "number" ? keyA : Number(keyA);
    const numB = typeof keyB === "number" ? keyB : Number(keyB);
    if (String(numA) === String(keyA) && String(numB) === String(keyB)) {
      return numA === numB;
    }
  }
  return String(keyA) === String(keyB);
};

/** `contains`: membership for arrays, substring for text answers. */
const answerContains = (answer: unknown, needle: unknown): boolean => {
  if (Array.isArray(answer)) {
    return answer.some((item) => valuesEqual(item, needle));
  }
  const haystack = String(answer ?? "").toLowerCase();
  const fragment = String(needle ?? "").toLowerCase();
  return haystack.includes(fragment);
};

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  return false;
};

/** Numeric view of an answer/variable; arrays sum their numeric members. */
export const numericValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value)) {
    let sum = 0;
    let found = false;
    for (const item of value) {
      const n = numericValue(item);
      if (n !== null) {
        sum += n;
        found = true;
      }
    }
    return found ? sum : null;
  }
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

/* -------------------------------------------------------------------------- */
/* Condition / rule evaluation                                                 */
/* -------------------------------------------------------------------------- */

const conditionSourceKey = (
  condition: LogicEngineCondition,
): string | undefined => condition.sourceKey ?? condition.pageKey ?? undefined;

const readSourceValue = (
  condition: LogicEngineCondition,
  ctx: EngineContext,
): unknown => {
  const key = conditionSourceKey(condition);
  if (!key) return undefined;
  if (condition.sourceType === "variable") {
    // Freshly computed values take precedence over the static defaults.
    if (key in ctx.computedVariables) {
      return ctx.computedVariables[key];
    }
    return ctx.variablesByName.get(key)?.value;
  }
  return ctx.answers[key];
};

export const evaluateCondition = (
  condition: LogicEngineCondition,
  ctx: EngineContext,
): boolean => {
  if (!conditionSourceKey(condition)) return false;
  const raw = readSourceValue(condition, ctx);

  switch (condition.operator) {
    case "isEmpty":
      return isEmptyValue(raw);
    case "isNotEmpty":
      return !isEmptyValue(raw);
    case "notEquals":
      return !valuesEqual(raw, condition.value);
    case "contains":
      return !isEmptyValue(raw) && answerContains(raw, condition.value);
    case "notContains":
      return isEmptyValue(raw) || !answerContains(raw, condition.value);
    case "greaterThan":
    case "greaterThanOrEquals":
    case "lessThan":
    case "lessThanOrEquals": {
      const a = numericValue(raw);
      const b = numericValue(condition.value);
      if (a === null || b === null) return false;
      switch (condition.operator) {
        case "greaterThan":
          return a > b;
        case "greaterThanOrEquals":
          return a >= b;
        case "lessThan":
          return a < b;
        default:
          return a <= b;
      }
    }
    case "equals":
    default:
      return valuesEqual(raw, condition.value);
  }
};

export const evaluateRule = (
  rule: LogicEngineRule,
  ctx: EngineContext,
): boolean => {
  if (rule.enabled === false) return false;
  const conditions = (rule.conditions ?? []).filter(
    (c) => c && conditionSourceKey(c),
  );
  if (conditions.length === 0) return false;

  // Each condition carries its own combinator joining it to the previous one;
  // the first condition has none. Legacy rules with only a rule-level
  // combinator fall back to it. Folded left-to-right (no operator precedence).
  const ruleFallback = rule.combinator ?? "and";
  let result = evaluateCondition(conditions[0], ctx);
  for (let i = 1; i < conditions.length; i++) {
    const op = conditions[i].combinator ?? ruleFallback;
    result =
      op === "or"
        ? result || evaluateCondition(conditions[i], ctx)
        : result && evaluateCondition(conditions[i], ctx);
  }
  return result;
};

/* -------------------------------------------------------------------------- */
/* Category helpers                                                            */
/* -------------------------------------------------------------------------- */

const LEGACY_ACTION_CATEGORY: Record<
  string,
  NonNullable<LogicEngineRule["category"]>
> = {
  show: "display",
  hide: "hidePage",
  goToPage: "branching",
  skipTo: "branching",
};

/** Rules created before `category` existed infer it from their first action. */
export const ruleCategory = (
  rule: LogicEngineRule,
): NonNullable<LogicEngineRule["category"]> => {
  if (rule.category) return rule.category;
  const firstAction = (rule.actions ?? [])[0]?.action;
  return LEGACY_ACTION_CATEGORY[firstAction ?? ""] ?? "display";
};

const actionTarget = (action: LogicEngineAction): string | undefined =>
  action.targetPageKey ?? action.target ?? undefined;

const ruleReferencesPage = (rule: LogicEngineRule, pageKey: string): boolean =>
  (rule.actions ?? []).some((a) => a && actionTarget(a) === pageKey);

const ruleOwnerPageKey = (rule: LogicEngineRule): string | undefined => {
  const firstPageCondition = (rule.conditions ?? []).find(
    (c) =>
      c && (!c.sourceType || c.sourceType === "page") && conditionSourceKey(c),
  );
  return firstPageCondition
    ? conditionSourceKey(firstPageCondition)
    : undefined;
};

/* -------------------------------------------------------------------------- */
/* Full resolution                                                             */
/* -------------------------------------------------------------------------- */

export const resolveFormLogic = ({
  pages,
  answers,
  variables = [],
  rules,
}: ResolveFormLogicInput): ResolveFormLogicResult => {
  const pageKeys = new Set(pages.map((p) => p.pageKey));
  const variablesByName = new Map(
    variables
      .filter((v) => v && typeof v.name === "string")
      .map((v) => [v.name, v]),
  );
  const hiddenPageKeys = new Set<string>();
  const computedVariables: Record<string, number | string> = {};
  const jumpTargets: Record<string, string> = {};
  const ctx: EngineContext = { answers, variablesByName, computedVariables };

  // --- 1. Calculation variables ---------------------------------------------
  // Run first so display rules can reference freshly computed values.
  for (const rule of rules) {
    if (ruleCategory(rule) !== "calculation") continue;
    if (rule.enabled === false) continue;
    // Rules without conditions always run; otherwise they must match.
    const hasConditions = (rule.conditions ?? []).some(
      (c) => c && conditionSourceKey(c),
    );
    if (hasConditions && !evaluateRule(rule, ctx)) continue;

    for (const action of rule.actions ?? []) {
      if (!action || !action.variableName) continue;
      if (
        typeof action.expression === "string" &&
        action.expression.trim() !== ""
      ) {
        try {
          computedVariables[action.variableName] = evaluateExpression(
            action.expression,
            (ref): number | undefined => {
              // Computed variables win, then static variables, then answers.
              if (ref in computedVariables) {
                const n = Number(computedVariables[ref]);
                return Number.isFinite(n) ? n : undefined;
              }
              if (variablesByName.has(ref)) {
                return (
                  numericValue(variablesByName.get(ref)!.value) ?? undefined
                );
              }
              if (ctx.answers[ref] !== undefined) {
                return numericValue(ctx.answers[ref]) ?? undefined;
              }
              return undefined;
            },
          );
        } catch {
          // Unresolvable reference or empty answer: keep the previous value.
        }
      } else if (action.value !== undefined && action.value !== null) {
        computedVariables[action.variableName] =
          action.value as number | string;
      }
    }
  }

  // --- 2. Page visibility (display / hidePage rules) ------------------------
  for (const page of pages) {
    const showRules = rules.filter(
      (r) =>
        ruleCategory(r) === "display" && ruleReferencesPage(r, page.pageKey),
    );
    const hideRules = rules.filter(
      (r) =>
        ruleCategory(r) === "hidePage" && ruleReferencesPage(r, page.pageKey),
    );

    const shownByRule = showRules.some((r) => evaluateRule(r, ctx));
    const hiddenByRule = hideRules.some((r) => evaluateRule(r, ctx));

    // A page with display rules is opt-in: visible only while at least one
    // rule matches. hidePage rules always win.
    if (hiddenByRule || (showRules.length > 0 && !shownByRule)) {
      hiddenPageKeys.add(page.pageKey);
    }
  }

  // --- 3. Branching (jump) targets ------------------------------------------
  for (const rule of rules) {
    if (ruleCategory(rule) !== "branching") continue;
    if (!evaluateRule(rule, ctx)) continue;

    const ownerKey = ruleOwnerPageKey(rule);
    if (!ownerKey || !pageKeys.has(ownerKey)) continue;
    if (jumpTargets[ownerKey]) continue; // first matching rule wins

    const action = (rule.actions ?? []).find(
      (a) =>
        a &&
        (a.action === "jumpToPage" ||
          a.action === "goToEnd" ||
          a.action === "goToPage" ||
          a.action === "skipTo"),
    );
    if (!action) continue;

    if (action.action === "goToEnd") {
      jumpTargets[ownerKey] = JUMP_TO_END;
      continue;
    }
    const target = actionTarget(action);
    if (!target || !pageKeys.has(target) || target === ownerKey) continue;
    jumpTargets[ownerKey] = target;
  }

  return { hiddenPageKeys, computedVariables, jumpTargets };
};




