import { z } from "zod";
import {
  logicActionTypes,
  logicCalcOperations,
  logicCategories,
  logicCombinators,
  logicOperators,
  logicSourceTypes,
} from "../../constants/pageTypes";

const conditionSchema = z.object({
  sourceType: z.enum(logicSourceTypes).optional(),
  sourceKey: z.string().min(1, "Condition source is required"),
  operator: z.enum(logicOperators),
  value: z.any().optional(),
  // Per-condition join to the previous condition (first condition has none).
  combinator: z.enum(logicCombinators).optional(),
});

const actionSchema = z
  .object({
    action: z.enum(logicActionTypes),
    targetPageKey: z.string().optional(),
    variableName: z.string().optional(),
    operation: z.enum(logicCalcOperations).optional(),
    expression: z.string().max(2000).optional(),
    value: z.any().optional(),
  })
  .refine(
    (v) =>
      !["showPage", "hidePage", "jumpToPage"].includes(v.action) ||
      !!v.targetPageKey,
    { message: "targetPageKey is required for page actions" }
  )
  .refine((v) => v.action !== "setVariable" || !!v.variableName, {
    message: "variableName is required for setVariable actions",
  });

const categoryFields = {
  category: z.enum(logicCategories).optional(),
  name: z.string().max(200).optional(),
  enabled: z.boolean().optional(),
  combinator: z.enum(logicCombinators).optional(),
  conditions: z.array(conditionSchema).max(50),
  actions: z.array(actionSchema).max(20),
  order: z.number().int().min(0).optional(),
};

/** Shared rule shape used by create, update and replace-all validation. */
const logicRuleBodySchema = z.object({
  _id: z.string().optional(),
  ...categoryFields,
  conditions: z.array(conditionSchema).max(50).optional(),
  actions: z.array(actionSchema).max(20).optional(),
});

export const createLogicSchema = {
  body: z.object(categoryFields),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateLogicSchema = {
  body: z.object({
    category: z.enum(logicCategories).optional(),
    name: z.string().max(200).optional(),
    enabled: z.boolean().optional(),
    combinator: z.enum(logicCombinators).optional(),
    conditions: z.array(conditionSchema).max(50).optional(),
    actions: z.array(actionSchema).max(20).optional(),
    order: z.number().int().min(0).optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    logicId: z.string().min(1, "Logic ID is required"),
  }),
};

/** PUT /forms/:formId/logic — replace every logic rule of the form at once. */
export const replaceAllLogicSchema = {
  body: z.object({
    rules: z.array(logicRuleBodySchema).max(500),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const logicIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    logicId: z.string().min(1, "Logic ID is required"),
  }),
};
