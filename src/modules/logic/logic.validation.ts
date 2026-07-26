import { z } from "zod";

export const createLogicSchema = {
  body: z.object({
    conditions: z.array(
      z.object({
        fieldKey: z.string().min(1),
        operator: z.enum(["equals", "notEquals", "contains", "greaterThan", "lessThan"]),
        value: z.any(),
      })
    ),
    actions: z.array(
      z.object({
        action: z.enum(["show", "hide", "goToField", "goToEnd", "skipTo"]),
        target: z.string().optional(),
      })
    ),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateLogicSchema = {
  body: z.object({
    conditions: z
      .array(
        z.object({
          fieldKey: z.string().min(1),
          operator: z.enum(["equals", "notEquals", "contains", "greaterThan", "lessThan"]),
          value: z.any(),
        })
      )
      .optional(),
    actions: z
      .array(
        z.object({
          action: z.enum(["show", "hide", "goToField", "goToEnd", "skipTo"]),
          target: z.string().optional(),
        })
      )
      .optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    logicId: z.string().min(1, "Logic ID is required"),
  }),
};

export const logicIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    logicId: z.string().min(1, "Logic ID is required"),
  }),
};