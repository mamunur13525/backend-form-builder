/**
 * Central registry of every page ("page") type supported by the form builder.
 * Keep this list as the single source of truth: the Mongoose enum, the Zod
 * validators and the per-type default settings are all derived from it.
 */
export const pageTypes = [
  "shortText",
  "longText",
  "email",
  "phone",
  "number",
  "date",
  "time",
  "radio",
  "checkbox",
  "select",
  "multiSelect",
  "dropdown",
  "file",
  "rating",
  "yesNo",
  "url",
  "statement",
  "address",
  "opinionScale",
  "signature",
  "matrix",
] as const;

export type PageType = (typeof pageTypes)[number];

/** Page types that never collect an answer from the respondent. */
export const displayOnlyPageTypes: PageType[] = ["statement"];

export const logicOperators = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "greaterThan",
  "greaterThanOrEquals",
  "lessThan",
  "lessThanOrEquals",
  "isEmpty",
  "isNotEmpty",
] as const;

/** Legacy per-page logic actions (IFormPage.logic). Kept for backwards compat. */
export const logicActions = ["show", "hide", "goToPage", "goToEnd"] as const;

/* ------------------------------------------------------------------------- */
/* Form-level logic rules (Logic Builder)                                     */
/* ------------------------------------------------------------------------- */

/** What a rule does at a glance — drives the Logic Builder sections. */
export const logicCategories = [
  "display",
  "hidePage",
  "branching",
  "calculation",
] as const;

/** Where a condition reads its value from. */
export const logicSourceTypes = ["page", "variable"] as const;

/** How multiple conditions inside one rule combine. */
export const logicCombinators = ["and", "or"] as const;

/** Runtime effects a rule can trigger. */
export const logicActionTypes = [
  "showPage",
  "hidePage",
  "jumpToPage",
  "goToEnd",
  "setVariable",
] as const;

/**
 * Arithmetic operations a calculation rule can apply to its target variable.
 * The operand (a literal number or a `@number-variable`) is carried in the
 * action's `value`. `set` overwrites; the rest fold onto the running value.
 */
export const logicCalcOperations = [
  "set",
  "add",
  "subtract",
  "multiply",
  "divide",
] as const;

export type LogicCategory = (typeof logicCategories)[number];
export type LogicSourceType = (typeof logicSourceTypes)[number];
export type LogicCombinator = (typeof logicCombinators)[number];
export type LogicActionType = (typeof logicActionTypes)[number];
export type LogicCalcOperation = (typeof logicCalcOperations)[number];
export type LogicOperator = (typeof logicOperators)[number];

/* -------------------------------------------------------------------------- */
/* Statement embeds                                                            */
/* -------------------------------------------------------------------------- */

export const embedProviders = [
  "youtube",
  "loom",
  "vimeo",
  "pdf",
  "image",
  "other",
] as const;

export type EmbedProvider = (typeof embedProviders)[number];

/* -------------------------------------------------------------------------- */
/* Phone                                                                       */
/* -------------------------------------------------------------------------- */

export const countryCodeModes = ["auto", "specific"] as const;

/* -------------------------------------------------------------------------- */
/* Choice pages (select / multiSelect)                                        */
/* -------------------------------------------------------------------------- */

export const selectionLimitModes = ["none", "exact", "range"] as const;

/** Allowed values for "options per row" when options are aligned horizontally. */
export const optionsPerRowValues = [1, 2, 3, 4, 5, 6] as const;

export const DEFAULT_OPTIONS_PER_ROW_DESKTOP = 3;
export const DEFAULT_OPTIONS_PER_ROW_MOBILE = 1;

/* -------------------------------------------------------------------------- */
/* Rating / Opinion scale                                                      */
/* -------------------------------------------------------------------------- */

export const ratingStyles = ["star", "number"] as const;

export const DEFAULT_RATING_STYLE = "star";
export const DEFAULT_RATING_MAX = 5;
export const MAX_RATING_VALUE = 10;

export const DEFAULT_SCALE_MIN = 0;
export const DEFAULT_SCALE_MAX = 10;
export const SCALE_LOWER_BOUND = 0;
export const SCALE_UPPER_BOUND = 100;

/* -------------------------------------------------------------------------- */
/* Address                                                                     */
/* -------------------------------------------------------------------------- */

export const addressPageKeys = [
  "address1",
  "address2",
  "city",
  "state",
  "zip",
  "country",
] as const;

export type AddressPageKey = (typeof addressPageKeys)[number];

export interface AddressSubPageDefault {
  key: AddressPageKey;
  label: string;
  placeholder: string;
  required: boolean;
  hidden: boolean;
  order: number;
}

export const defaultAddressPages: AddressSubPageDefault[] = [
  { key: "address1", label: "Address", placeholder: "", required: false, hidden: false, order: 1 },
  { key: "address2", label: "Address line 2", placeholder: "", required: false, hidden: false, order: 2 },
  { key: "city", label: "City", placeholder: "", required: false, hidden: false, order: 3 },
  { key: "state", label: "State", placeholder: "", required: false, hidden: false, order: 4 },
  { key: "zip", label: "Zip", placeholder: "", required: false, hidden: false, order: 5 },
  { key: "country", label: "Country", placeholder: "", required: false, hidden: false, order: 6 },
];

/* -------------------------------------------------------------------------- */
/* Upload                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Grouped MIME categories offered in the "Allowed File Types" multi-select.
 * A value is either a whole group (e.g. `image`) or a concrete extension
 * (e.g. `image/png`).
 */
export const fileTypeGroups = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/heic",
  ],
  video: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"],
  text: ["text/plain", "text/csv", "text/html", "text/markdown"],
  application: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/json",
  ],
} as const;

export type FileTypeGroup = keyof typeof fileTypeGroups;

export const fileTypeGroupNames = Object.keys(fileTypeGroups) as FileTypeGroup[];

/** Every acceptable value for `settings.upload.allowedFileTypes`. */
export const allowedFileTypeValues: string[] = [
  ...fileTypeGroupNames,
  ...Object.values(fileTypeGroups).flat(),
];

/** Expand group shorthands ("image") into their concrete MIME types. */
export const expandFileTypes = (values: string[] = []): string[] => {
  const expanded = values.flatMap((value) =>
    fileTypeGroupNames.includes(value as FileTypeGroup)
      ? [...fileTypeGroups[value as FileTypeGroup]]
      : [value]
  );
  return [...new Set(expanded)];
};

export const DEFAULT_MAX_UPLOAD_SIZE_MB = 10;
export const MAX_UPLOAD_SIZE_MB = 100;

/* -------------------------------------------------------------------------- */
/* Matrix                                                                      */
/* -------------------------------------------------------------------------- */

export const MAX_MATRIX_ROWS = 50;
export const MAX_MATRIX_COLUMNS = 20;
