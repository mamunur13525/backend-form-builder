import { z } from "zod";

export const createFieldSchema = {
  body: z.object({
    type: z.enum([
      "shortText", "longText", "email", "phone", "number",
      "date", "time", "radio", "checkbox", "select",
      "multiSelect", "file", "rating", "yesNo", "url",
    ]),
    label: z.string().min(1, "Label is required").max(500),
    helperText: z.string().max(500).optional(),
    placeholder: z.string().max(200).optional(),
    required: z.boolean().optional(),
    options: z
      .array(
        z.object({
          label: z.string().optional(),
          value: z.string().optional(),
        })
      )
      .optional(),
    validation: z
      .object({
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        message: z.string().optional(),
      })
      .optional(),
    appearance: z
      .object({
        width: z.enum(["full", "half"]).optional(),
        icon: z.string().optional(),
        submitButtonText: z.string().optional(),
        submitButtonColor: z.string().optional(),
      })
      .optional(),
  }).strict(), // Prevent additional fields like 'order' from being passed
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateFieldSchema = {
  body: z.object({
    type: z
      .enum([
        "shortText", "longText", "email", "phone", "number",
        "date", "time", "radio", "checkbox", "select",
        "multiSelect", "file", "rating", "yesNo", "url",
      ])
      .optional(),
    label: z.string().max(500).optional(),
    helperText: z.string().max(500).optional(),
    placeholder: z.string().max(200).optional(),
    required: z.boolean().optional(),
    options: z
      .array(
        z.object({
          label: z.string().optional(),
          value: z.string().optional(),
        })
      )
      .optional(),
    validation: z
      .object({
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        message: z.string().optional(),
      })
      .optional(),
    appearance: z
      .object({
        width: z.enum(["full", "half"]).optional(),
        icon: z.string().optional(),
        submitButtonText: z.string().optional(),
        submitButtonColor: z.string().optional(),
      })
      .optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    fieldId: z.string().min(1, "Field ID is required"),
  }),
};

export const reorderFieldsSchema = {
  body: z.object({
    fieldIds: z.array(z.string()).min(1, "At least one field ID is required"),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const fieldLogicSchema = {
  body: z.object({
    logic: z.array(
      z.object({
        whenFieldKey: z.string().optional(),
        operator: z
          .enum(["equals", "notEquals", "contains", "greaterThan", "lessThan"])
          .optional(),
        value: z.any().optional(),
        action: z.enum(["show", "hide", "goToField", "goToEnd"]).optional(),
        targetFieldKey: z.string().optional(),
      })
    ),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    fieldId: z.string().min(1, "Field ID is required"),
  }),
};

export const fieldIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    fieldId: z.string().min(1, "Field ID is required"),
  }),
};

export const deleteFieldLogicSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    fieldId: z.string().min(1, "Field ID is required"),
  }),
};