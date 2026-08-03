import { z } from "zod";
import {
  addressFieldKeys,
  allowedFileTypeValues,
  countryCodeModes,
  embedProviders,
  fieldTypes,
  logicActions,
  logicOperators,
  MAX_MATRIX_COLUMNS,
  MAX_MATRIX_ROWS,
  MAX_RATING_VALUE,
  MAX_UPLOAD_SIZE_MB,
  optionsPerRowValues,
  ratingStyles,
  SCALE_LOWER_BOUND,
  SCALE_UPPER_BOUND,
  selectionLimitModes,
} from "../../constants/fieldTypes";

const fieldTypeEnum = z.enum(fieldTypes);

const optionSchema = z.object({
  label: z.string().optional(),
  value: z.string().optional(),
});

const coverImageSchema = z.object({
  url: z.string().max(2000),
  fileId: z.string().max(100).optional(),
  alt: z.string().max(300).optional(),
});

/** Blank (null) means "no limit" for the character/number bounds. */
const optionalLimit = z.number().int().nonnegative().nullish();

const validationSchema = z
  .object({
    minLength: optionalLimit,
    maxLength: optionalLimit,
    min: z.number().nullish(),
    max: z.number().nullish(),
    pattern: z.string().optional(),
    message: z.string().max(500).optional(),
  })
  .refine(
    (v) =>
      v.minLength == null || v.maxLength == null || v.minLength <= v.maxLength,
    { message: "minLength cannot be greater than maxLength", path: ["minLength"] }
  )
  .refine((v) => v.min == null || v.max == null || v.min <= v.max, {
    message: "min cannot be greater than max",
    path: ["min"],
  });

const optionsPerRowSchema = z.object({
  desktop: z
    .number()
    .int()
    .refine((n) => (optionsPerRowValues as readonly number[]).includes(n), {
      message: `Must be one of: ${optionsPerRowValues.join(", ")}`,
    })
    .optional(),
  mobile: z
    .number()
    .int()
    .refine((n) => (optionsPerRowValues as readonly number[]).includes(n), {
      message: `Must be one of: ${optionsPerRowValues.join(", ")}`,
    })
    .optional(),
});

const selectionLimitSchema = z
  .object({
    mode: z.enum(selectionLimitModes),
    exact: z.number().int().positive().nullish(),
    min: z.number().int().nonnegative().nullish(),
    max: z.number().int().positive().nullish(),
  })
  .refine((v) => v.mode !== "exact" || v.exact != null, {
    message: "exact is required when mode is 'exact'",
    path: ["exact"],
  })
  .refine((v) => v.mode !== "range" || (v.min != null && v.max != null), {
    message: "min and max are required when mode is 'range'",
    path: ["min"],
  })
  .refine(
    (v) => v.mode !== "range" || v.min == null || v.max == null || v.min <= v.max,
    { message: "min cannot be greater than max", path: ["min"] }
  );

const addressSubFieldSchema = z.object({
  key: z.enum(addressFieldKeys),
  label: z.string().max(200),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().optional(),
  hidden: z.boolean().optional(),
  order: z.number().int().positive().optional(),
});

const matrixEntrySchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().max(500).optional(),
  order: z.number().int().positive(),
});

const settingsSchema = z
  .object({
    email: z
      .object({
        businessEmailsOnly: z.boolean().optional(),
        emailVerification: z.boolean().optional(),
      })
      .optional(),

    phone: z
      .object({
        phoneVerification: z.boolean().optional(),
        countryCodeMode: z.enum(countryCodeModes).optional(),
        defaultCountry: z
          .object({
            iso2: z.string().max(2).optional(),
            name: z.string().max(100).optional(),
            dialCode: z.string().max(10).optional(),
          })
          .optional(),
      })
      .refine(
        (v) =>
          v.countryCodeMode !== "specific" ||
          Boolean(v.defaultCountry?.iso2 || v.defaultCountry?.dialCode),
        {
          message: "defaultCountry is required when countryCodeMode is 'specific'",
          path: ["defaultCountry"],
        }
      )
      .optional(),

    statement: z
      .object({
        embedUrl: z.union([z.literal(""), z.string().url()]).optional(),
        embedProvider: z.enum(embedProviders).optional(),
        embedTitle: z.string().max(300).optional(),
      })
      .optional(),

    choice: z
      .object({
        allowOther: z.boolean().optional(),
        otherLabel: z.string().max(200).optional(),
        horizontalAlign: z.boolean().optional(),
        optionsPerRow: optionsPerRowSchema.optional(),
        hideLabels: z.boolean().optional(),
        selectionLimit: selectionLimitSchema.optional(),
      })
      .optional(),

    address: z
      .object({
        fields: z.array(addressSubFieldSchema).max(addressFieldKeys.length).optional(),
      })
      .optional(),

    rating: z
      .object({
        style: z.enum(ratingStyles).optional(),
        max: z.number().int().min(2).max(MAX_RATING_VALUE).optional(),
      })
      .optional(),

    opinionScale: z
      .object({
        min: z.number().int().min(SCALE_LOWER_BOUND).max(SCALE_UPPER_BOUND).optional(),
        max: z.number().int().min(SCALE_LOWER_BOUND).max(SCALE_UPPER_BOUND).optional(),
        leftLabel: z.string().max(200).optional(),
        rightLabel: z.string().max(200).optional(),
      })
      .refine((v) => v.min == null || v.max == null || v.min < v.max, {
        message: "min must be less than max",
        path: ["min"],
      })
      .optional(),

    upload: z
      .object({
        allowMultiple: z.boolean().optional(),
        allowedFileTypes: z
          .array(z.enum(allowedFileTypeValues as [string, ...string[]]))
          .optional(),
        maxFileSizeMb: z.number().positive().max(MAX_UPLOAD_SIZE_MB).optional(),
      })
      .optional(),

    matrix: z
      .object({
        rows: z.array(matrixEntrySchema).max(MAX_MATRIX_ROWS).optional(),
        columns: z.array(matrixEntrySchema).max(MAX_MATRIX_COLUMNS).optional(),
        allowMultiplePerRow: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

const appearanceSchema = z.object({
  width: z.enum(["full", "half"]).optional(),
  icon: z.string().optional(),
  submitButtonText: z.string().optional(),
  submitButtonColor: z.string().optional(),
});

export const createFieldSchema = {
  body: z
    .object({
      type: fieldTypeEnum,
      label: z.string().max(500),
      helperText: z.string().max(500).optional(),
      placeholder: z.string().max(200).optional(),
      required: z.boolean().optional(),
      coverImage: coverImageSchema.nullish(),
      options: z.array(optionSchema).optional(),
      validation: validationSchema.optional(),
      settings: settingsSchema.optional(),
      appearance: appearanceSchema.optional(),
    })
    .strict(), // Prevent additional fields like 'order' from being passed
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateFieldSchema = {
  body: z.object({
    type: fieldTypeEnum.optional(),
    label: z.string().max(500).optional(),
    helperText: z.string().max(500).optional(),
    placeholder: z.string().max(200).optional(),
    required: z.boolean().optional(),
    coverImage: coverImageSchema.nullish(),
    options: z.array(optionSchema).optional(),
    validation: validationSchema.optional(),
    settings: settingsSchema.optional(),
    appearance: appearanceSchema.optional(),
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
        operator: z.enum(logicOperators).optional(),
        value: z.any().optional(),
        action: z.enum(logicActions).optional(),
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
