import { z } from "zod";
import {
  detectionMethods,
  responseLimitPeriods,
  responseLimitTypes,
} from "../../models/Form";

/** Shared params validator for every settings route. */
const formIdParams = z.object({
  formId: z.string().min(1, "Form ID is required"),
});

const emptyOrUrl = z.union([z.string().url("Invalid URL"), z.literal("")]);

/* -------------------------------------------------------------------------- */
/* General                                                                    */
/* -------------------------------------------------------------------------- */

const refillLinkSchema = z
  .object({
    isActive: z.boolean().optional(),
    link: emptyOrUrl.optional(),
  })
  .strict();

export const getSettingsSchema = {
  params: formIdParams,
};

export const updateGeneralSettingsSchema = {
  body: z
    .object({
      show_progress_bar: z.boolean().optional(),
      initial_loader: z.boolean().optional(),
      navigation_arrows: z.boolean().optional(),
      refill_link: refillLinkSchema.optional(),
      show_powered_by_company_name: z.boolean().optional(),
      anonymous_survey: z.boolean().optional(),
    })
    .strict(),
  params: formIdParams,
};

/* -------------------------------------------------------------------------- */
/* Email settings                                                             */
/* -------------------------------------------------------------------------- */

const multipleRecipientsSchema = z
  .object({
    isActive: z.boolean().optional(),
    emails: z.array(z.string().email("Invalid recipient email")).optional(),
  })
  .strict();

const customEmailSchema = z
  .object({
    isActive: z.boolean().optional(),
    address: z.string().email("Invalid email address").optional(),
  })
  .strict();

const replyToSchema = z
  .object({
    automatic_first_email_field: z.boolean().optional(),
    custom_email: customEmailSchema.optional(),
  })
  .strict();

export const updateEmailSettingsSchema = {
  body: z
    .object({
      receive_email_notification: z.boolean().optional(),
      multiple_recipients: multipleRecipientsSchema.optional(),
      reply_to: replyToSchema.optional(),
      email_subject: z.string().max(500).optional(),
      email_body: z.string().max(50000).optional(),
    })
    .strict(),
  params: formIdParams,
};

/* -------------------------------------------------------------------------- */
/* Access & scheduling                                                        */
/* -------------------------------------------------------------------------- */

const closeFormByDateSchema = z
  .object({
    isActive: z.boolean().optional(),
    date: z.coerce.date().nullish(),
  })
  .strict();

const closeFormBySubmissionsSchema = z
  .object({
    isActive: z.boolean().optional(),
    submissions: z.number().int().min(0).optional(),
  })
  .strict();

const autoRefreshInactivitySchema = z
  .object({
    isActive: z.boolean().optional(),
    minutes: z.number().int().min(1).optional(),
  })
  .strict();

const responseLimitSchema = z
  .object({
    type: z.enum(responseLimitTypes).optional(),
    count: z.number().int().min(1).optional(),
    period: z.enum(responseLimitPeriods).optional(),
  })
  .strict();

export const updateAccessSettingsSchema = {
  body: z
    .object({
      close_form: z.boolean().optional(),
      close_form_by_date: closeFormByDateSchema.optional(),
      close_form_by_submissions: closeFormBySubmissionsSchema.optional(),
      auto_refresh_inactivity: autoRefreshInactivitySchema.optional(),
      preventDuplicateSubmissions: z.boolean().optional(),
      detectionMethod: z.enum(detectionMethods).optional(),
      responseLimit: responseLimitSchema.optional(),
    })
    .strict(),
  params: formIdParams,
};

/* -------------------------------------------------------------------------- */
/* Hidden fields & variables                                                  */
/* -------------------------------------------------------------------------- */

const hiddenFieldSchema = z
  .object({
    key: z.string().max(300).optional(),
    value: z.string().max(3000).optional(),
  })
  .strict();

export const updateHiddenFieldsSchema = {
  body: z
    .object({
      enabled: z.boolean().optional(),
      fields: z.array(hiddenFieldSchema).max(200).optional(),
    })
    .strict(),
  params: formIdParams,
};

const variableSchema = z
  .object({
    name: z.string().min(1, "Variable name is required").max(200),
    type: z.enum(["text", "number"]),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })
  .strict();

export const updateVariablesSchema = {
  body: z
    .object({
      variables: z.array(variableSchema).max(500),
    })
    .strict(),
  params: formIdParams,
};