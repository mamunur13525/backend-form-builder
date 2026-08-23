import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";
import { FormStatus, formStatus, formStatusValues } from "../constants/status";
import {
  addressPageKeys,
  allowedFileTypeValues,
  countryCodeModes,
  defaultAddressPages,
  DEFAULT_MAX_UPLOAD_SIZE_MB,
  DEFAULT_OPTIONS_PER_ROW_DESKTOP,
  DEFAULT_OPTIONS_PER_ROW_MOBILE,
  DEFAULT_RATING_MAX,
  DEFAULT_RATING_STYLE,
  DEFAULT_SCALE_MAX,
  DEFAULT_SCALE_MIN,
  embedProviders,
  pageTypes,
  PageType,
  logicActions,
  logicOperators,
  ratingStyles,
  selectionLimitModes,
} from "../constants/pageTypes";
import {
  contentAlignments,
  ContentAlignment,
  cornerRadii,
  CornerRadius,
  DEFAULT_ALIGNMENT,
  DEFAULT_ANSWER_COLOR,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BUTTON_COLOR,
  DEFAULT_BUTTON_TEXT_COLOR,
  DEFAULT_CORNER_RADIUS,
  DEFAULT_FONT_SIZE,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_QUESTION_COLOR,
  DEFAULT_TEXT_COLOR,
  DEFAULT_THEME_BRIGHTNESS,
  DEFAULT_THEME_FONT,
  fontSizes,
  FontSize,
  themeFontSources,
  ThemeFontSource,
  THEME_BRIGHTNESS_MAX,
  THEME_BRIGHTNESS_MIN,
} from "../constants/theme";

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                              */
/* -------------------------------------------------------------------------- */

/** Cover image is available on every page type. */
export interface ICoverImage {
  url: string;
  fileId?: string;
  alt?: string;
}

export interface IPageOption {
  label?: string;
  value?: string;
}

/* -------------------------------------------------------------------------- */
/* Analysis settings                                                          */
/* -------------------------------------------------------------------------- */

/** How to detect a returning respondent when duplicate prevention is on. */
export type DetectionMethod = "cookie" | "ip" | "cookie_ip";

/** `single` blocks once the limit is hit; `multiple` allows up to `count`. */
export type ResponseLimitType = "single" | "multiple";

export type ResponseLimitPeriod = "day" | "month" | "year" | "lifetime";

export const detectionMethods: DetectionMethod[] = ["cookie", "ip", "cookie_ip"];

export const responseLimitTypes: ResponseLimitType[] = ["single", "multiple"];

export const responseLimitPeriods: ResponseLimitPeriod[] = [
  "day",
  "month",
  "year",
  "lifetime",
];

/** Lets a respondent start over with a fresh link after finishing a form. */
export interface IRefillLink {
  isActive: boolean;
  link: string;
}

export interface IGeneralSettings {
  show_progress_bar: boolean;
  initial_loader: boolean;
  navigation_arrows: boolean;
  refill_link: IRefillLink;
  show_powered_by_company_name: boolean;
  anonymous_survey: boolean;
}

export interface IMultipleRecipients {
  isActive: boolean;
  emails: string[];
}

export interface ICustomEmail {
  isActive: boolean;
  address: string;
}

export interface IReplyTo {
  /** Use the first email field chosen on the form as the notification Reply-To. */
  automatic_first_email_field: boolean;
  custom_email: ICustomEmail;
}

export interface IEmailSettings {
  receive_email_notification: boolean;
  multiple_recipients: IMultipleRecipients;
  reply_to: IReplyTo;
  email_subject: string;
  email_body: string;
}

export interface ICloseFormByDate {
  isActive: boolean;
  date: Date | null;
}

export interface ICloseFormBySubmissions {
  isActive: boolean;
  submissions: number;
}

export interface IAutoRefreshInactivity {
  isActive: boolean;
  minutes: number;
}

export interface IResponseLimit {
  type: ResponseLimitType;
  count: number;
  period: ResponseLimitPeriod;
}

export interface IAccessSettings {
  close_form: boolean;
  close_form_by_date: ICloseFormByDate;
  close_form_by_submissions: ICloseFormBySubmissions;
  auto_refresh_inactivity: IAutoRefreshInactivity;
  preventDuplicateSubmissions: boolean;
  detectionMethod: DetectionMethod;
  responseLimit: IResponseLimit;
}

export interface IHiddenField {
  key: string;
  value: string;
}

export interface IHiddenFieldsSettings {
  enabled: boolean;
  fields: IHiddenField[];
}

export interface IVariable {
  name: string;
  type: "text" | "number";
  value: any;
}

/**
 * Every form ships with these default variables already available in the
 * settings panel. They are always present in the normalized settings object;
 * a stored variable with the same name overrides the default value.
 */
export const DEFAULT_FORM_VARIABLES: IVariable[] = [
  { name: "score", type: "number", value: 0 },
  { name: "price", type: "number", value: 0 },
];

/**
 * The editable settings document that is snapshotted inside each
 * `FormVersion`. The legacy flat boolean knobs are kept for backwards
 * compatibility with the public-form rendering; the sub-groups are edited from
 * the settings panel.
 */
export interface IFormSettings {
  oneQuestionAtATime: boolean;
  showProgressBar: boolean;
  allowMultipleSubmissions: boolean;
  requireLogin: boolean;
  collectIP: boolean;

  general?: IGeneralSettings;
  emailSettings?: IEmailSettings;
  access?: IAccessSettings;
  hiddenFields?: IHiddenFieldsSettings;
  variables?: IVariable[];
}

/* -------------------------------------------------------------------------- */
/* Form-level appearance (theme)                                              */
/* -------------------------------------------------------------------------- */

export interface IThemeBackgroundImage {
  /** ImageKit URL, or a root-relative path served by the uploads module. */
  url: string;
  fileId?: string;
  alt?: string;
  /**
   * Relative brightness offset, -100..100, where 0 leaves the image untouched.
   * Only meaningful while `url` is set.
   */
  brightness: number;
  /** Tile the image at its natural size instead of covering the viewport. */
  tile: boolean;
}

export interface IThemeFont {
  family: string;
  source: ThemeFontSource;
  /** Font file to load. Required when `source` is "custom". */
  url?: string;
}

/**
 * Styles the whole form, every page included. Per-page overrides live in
 * `IFormPage.appearance`.
 */
export interface IFormTheme {
  primaryColor: string;
  backgroundColor: string;
  /** Fallback copy colour, used wherever a more specific colour is not set. */
  textColor: string;
  questionColor: string;
  answerColor: string;
  buttonColor: string;
  buttonTextColor: string;
  /** Applies to all content: question, answers and button. */
  alignment: ContentAlignment;
  fontSize: FontSize;
  /** Corner radius preset for inputs, choice options and buttons. */
  roundCorners: CornerRadius;
  /** Absent when the form has no background image. */
  backgroundImage?: IThemeBackgroundImage;
  font: IThemeFont;
}

/* -------------------------------------------------------------------------- */
/* Per-type settings                                                          */
/* -------------------------------------------------------------------------- */

export interface IEmailPageSettings {
  /** Reject free/consumer mail providers (gmail.com, yahoo.com, ...). */
  businessEmailsOnly: boolean;
  /** Send a verification code to the address before accepting the answer. */
  emailVerification: boolean;
}

export interface IPhonePageSettings {
  /** Sends an SMS code to verify the respondent's phone number. */
  phoneVerification: boolean;
  /** `auto` resolves the dial code from the respondent's country. */
  countryCodeMode: "auto" | "specific";
  /** Used when countryCodeMode === "specific". */
  defaultCountry?: {
    iso2?: string;
    name?: string;
    dialCode?: string;
  };
}

export interface IStatementPageSettings {
  /** Any embeddable link: YouTube, Loom, Vimeo, PDF, ... */
  embedUrl: string;
  embedProvider?: (typeof embedProviders)[number];
  embedTitle?: string;
}

export interface IChoicePageSettings {
  /** Adds an extra "Other" choice with a free-text input. */
  allowOther: boolean;
  otherLabel: string;
  /** Render options inline instead of stacked. */
  horizontalAlign: boolean;
  optionsPerRow: {
    desktop: number;
    mobile: number;
  };
  hideLabels: boolean;
  /** multiSelect only. */
  selectionLimit?: {
    mode: "none" | "exact" | "range";
    exact?: number;
    min?: number;
    max?: number;
  };
}

export interface IAddressSubPage {
  key: (typeof addressPageKeys)[number];
  label: string;
  placeholder: string;
  required: boolean;
  hidden: boolean;
  order: number;
}

export interface IAddressPageSettings {
  pages: IAddressSubPage[];
}

export interface IRatingPageSettings {
  /** `star` renders stars, `number` renders a numeric range. */
  style: "star" | "number";
  /** Highest selectable rating. */
  max: number;
}

export interface IOpinionScalePageSettings {
  min: number;
  max: number;
  leftLabel: string;
  rightLabel: string;
}

export interface IUploadPageSettings {
  allowMultiple: boolean;
  /** Group shorthands ("image") or concrete MIME types ("image/png"). */
  allowedFileTypes: string[];
  maxFileSizeMb: number;
}

export interface IMatrixEntry {
  key: string;
  label: string;
  order: number;
}

export interface IMatrixPageSettings {
  rows: IMatrixEntry[];
  columns: IMatrixEntry[];
  /** Allow multiple selections per row. */
  allowMultiplePerRow: boolean;
}

export interface IPageSettings {
  email?: IEmailPageSettings;
  phone?: IPhonePageSettings;
  statement?: IStatementPageSettings;
  choice?: IChoicePageSettings;
  address?: IAddressPageSettings;
  rating?: IRatingPageSettings;
  opinionScale?: IOpinionScalePageSettings;
  upload?: IUploadPageSettings;
  matrix?: IMatrixPageSettings;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                      */
/* -------------------------------------------------------------------------- */

export interface IFormPage {
  pageKey: string;
  label: string;
  helperText: string;
  placeholder: string;
  type: PageType;
  required: boolean;
  order: number;
  coverImage?: ICoverImage;
  options: IPageOption[];
  validation: {
    /** longText: minimum characters. Blank means no limit. */
    minLength?: number;
    /** longText: maximum characters. Blank means no limit. */
    maxLength?: number;
    /** number: minimum number. */
    min?: number;
    /** number: maximum number. */
    max?: number;
    pattern?: string;
    message?: string;
  };
  settings: IPageSettings;
  logic: {
    whenPageKey?: string;
    operator?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value?: any;
    action?: "show" | "hide" | "goToPage" | "goToEnd";
    targetPageKey?: string;
  }[];
  appearance: {
    width: "full" | "half";
    icon: string;
    submitButtonText?: string;
    submitButtonColor?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* End page                                                                   */
/* -------------------------------------------------------------------------- */

export interface IEndPageEmbed {
  url: string;
  provider?: (typeof embedProviders)[number];
  title?: string;
}

export interface IEndPageButton {
  text: string;
  link: string;
}

export interface IEndPageRedirect {
  isRedirect: boolean;
  link: string;
}

export interface IEndPageSocialShareMedia {
  facebook: boolean;
  twitter: boolean;
  linkedin: boolean;
  whatsapp?: boolean;
}

export interface IEndPage {
  _id?: mongoose.Types.ObjectId | string;
  key?: string;
  title: string;
  helperText?: string;
  paragraph?: string;
  coverImage?: ICoverImage;
  embed?: IEndPageEmbed;
  alignment: ContentAlignment;
  button: IEndPageButton;
  redirect: IEndPageRedirect;
  showConfetti: boolean;
  socialShareButtons: boolean;
  socialShareMessage: string;
  socialShareMedia: IEndPageSocialShareMedia;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IForm extends Document {
  title: string;
  slug: string;
  status: FormStatus;
  draftVersionId?: mongoose.Types.ObjectId;
  publishedVersionId?: mongoose.Types.ObjectId | null;
  hasUnpublishedChanges: boolean;
  theme: IFormTheme;
  settings: IFormSettings;
  pages: IFormPage[];
  endPages: IEndPage[];
  createdBy: IUser["_id"];
  updatedBy?: IUser["_id"];
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Settings sub-schemas                                                       */
/* -------------------------------------------------------------------------- */

const subDoc = { _id: false } as const;

const coverImageSchema = new Schema<ICoverImage>(
  {
    url: { type: String, default: "" },
    fileId: { type: String, default: "" },
    alt: { type: String, default: "" },
  },
  subDoc
);

/* -------------------------------------------------------------------------- */
/* Theme sub-schema (shared with FormVersion)                                  */
/* -------------------------------------------------------------------------- */

const themeBackgroundImageSchema = new Schema<IThemeBackgroundImage>(
  {
    url: { type: String, default: "" },
    fileId: { type: String, default: "" },
    alt: { type: String, default: "" },
    brightness: {
      type: Number,
      min: THEME_BRIGHTNESS_MIN,
      max: THEME_BRIGHTNESS_MAX,
      default: DEFAULT_THEME_BRIGHTNESS,
    },
    tile: { type: Boolean, default: false },
  },
  subDoc
);

const themeFontSchema = new Schema<IThemeFont>(
  {
    family: { type: String, default: DEFAULT_THEME_FONT.family },
    source: {
      type: String,
      enum: themeFontSources,
      default: DEFAULT_THEME_FONT.source,
    },
    url: { type: String, default: "" },
  },
  subDoc
);

/**
 * Exported so `FormVersion` snapshots share the exact same shape and defaults
 * as the live `Form` document.
 */
export const formThemeSchema = new Schema<IFormTheme>(
  {
    primaryColor: { type: String, default: DEFAULT_PRIMARY_COLOR },
    backgroundColor: { type: String, default: DEFAULT_BACKGROUND_COLOR },
    textColor: { type: String, default: DEFAULT_TEXT_COLOR },
    questionColor: { type: String, default: DEFAULT_QUESTION_COLOR },
    answerColor: { type: String, default: DEFAULT_ANSWER_COLOR },
    buttonColor: { type: String, default: DEFAULT_BUTTON_COLOR },
    buttonTextColor: { type: String, default: DEFAULT_BUTTON_TEXT_COLOR },
    alignment: { type: String, enum: contentAlignments, default: DEFAULT_ALIGNMENT },
    fontSize: { type: String, enum: fontSizes, default: DEFAULT_FONT_SIZE },
    roundCorners: { type: String, enum: cornerRadii, default: DEFAULT_CORNER_RADIUS },
    // Stays undefined until a background image is chosen.
    backgroundImage: { type: themeBackgroundImageSchema, default: undefined },
    font: { type: themeFontSchema, default: () => ({ ...DEFAULT_THEME_FONT }) },
  },
  subDoc
);

/* -------------------------------------------------------------------------- */
/* Form settings (general / email) sub-schemas                                 */
/* -------------------------------------------------------------------------- */

const refillLinkSchema = new Schema<IRefillLink>(
  {
    isActive: { type: Boolean, default: false },
    link: { type: String, default: "" },
  },
  subDoc
);

const generalSettingsSchema = new Schema<IGeneralSettings>(
  {
    show_progress_bar: { type: Boolean, default: true },
    initial_loader: { type: Boolean, default: true },
    navigation_arrows: { type: Boolean, default: true },
    refill_link: { type: refillLinkSchema, default: () => ({ isActive: false, link: "" }) },
    show_powered_by_company_name: { type: Boolean, default: true },
    anonymous_survey: { type: Boolean, default: false },
  },
  subDoc
);

const multipleRecipientsSchema = new Schema<IMultipleRecipients>(
  {
    isActive: { type: Boolean, default: false },
    emails: { type: [String], default: [] },
  },
  subDoc
);

const customEmailSchema = new Schema<ICustomEmail>(
  {
    isActive: { type: Boolean, default: false },
    address: { type: String, default: "" },
  },
  subDoc
);

const replyToSchema = new Schema<IReplyTo>(
  {
    automatic_first_email_field: { type: Boolean, default: false },
    custom_email: { type: customEmailSchema, default: () => ({ isActive: false, address: "" }) },
  },
  subDoc
);

const formEmailSettingsSchema = new Schema<IEmailSettings>(
  {
    receive_email_notification: { type: Boolean, default: false },
    multiple_recipients: { type: multipleRecipientsSchema, default: () => ({ isActive: false, emails: [] }) },
    reply_to: {
      type: replyToSchema,
      default: () => ({
        automatic_first_email_field: false,
        custom_email: { isActive: false, address: "" },
      }),
    },
    email_subject: { type: String, default: "" },
    email_body: { type: String, default: "" },
  },
  subDoc
);

/* -------------------------------------------------------------------------- */
/* Form settings (access) sub-schemas                                          */
/* -------------------------------------------------------------------------- */

const closeFormByDateSchema = new Schema<ICloseFormByDate>(
  {
    isActive: { type: Boolean, default: false },
    date: { type: Date, default: null },
  },
  subDoc
);

const closeFormBySubmissionsSchema = new Schema<ICloseFormBySubmissions>(
  {
    isActive: { type: Boolean, default: false },
    submissions: { type: Number, default: 0, min: 0 },
  },
  subDoc
);

const autoRefreshInactivitySchema = new Schema<IAutoRefreshInactivity>(
  {
    isActive: { type: Boolean, default: false },
    minutes: { type: Number, default: 5, min: 1 },
  },
  subDoc
);

const responseLimitSchema = new Schema<IResponseLimit>(
  {
    type: { type: String, enum: responseLimitTypes, default: "single" },
    count: { type: Number, default: 1, min: 1 },
    period: { type: String, enum: responseLimitPeriods, default: "lifetime" },
  },
  subDoc
);

const accessSettingsSchema = new Schema<IAccessSettings>(
  {
    close_form: { type: Boolean, default: false },
    close_form_by_date: {
      type: closeFormByDateSchema,
      default: () => ({ isActive: false, date: null }),
    },
    close_form_by_submissions: {
      type: closeFormBySubmissionsSchema,
      default: () => ({ isActive: false, submissions: 0 }),
    },
    auto_refresh_inactivity: {
      type: autoRefreshInactivitySchema,
      default: () => ({ isActive: false, minutes: 5 }),
    },
    preventDuplicateSubmissions: { type: Boolean, default: false },
    detectionMethod: {
      type: String,
      enum: detectionMethods,
      default: "cookie_ip",
    },
    responseLimit: {
      type: responseLimitSchema,
      default: () => ({ type: "single", count: 1, period: "lifetime" }),
    },
  },
  subDoc
);

/* -------------------------------------------------------------------------- */
/* Form settings (hidden fields / variables) sub-schemas + exported schema     */
/* -------------------------------------------------------------------------- */

const hiddenFieldSchema = new Schema<IHiddenField>(
  {
    key: { type: String, default: "" },
    value: { type: String, default: "" },
  },
  subDoc
);

const hiddenFieldsSettingsSchema = new Schema<IHiddenFieldsSettings>(
  {
    enabled: { type: Boolean, default: false },
    fields: { type: [hiddenFieldSchema], default: [] },
  },
  subDoc
);

const variableSchema = new Schema<IVariable>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["text", "number"], required: true },
    value: { type: Schema.Types.Mixed, default: "" },
  },
  subDoc
);

/**
 * Exported so `FormVersion` snapshots share the exact same shape and defaults
 * as the live `Form` document.
 */
export const formSettingsSchema = new Schema<IFormSettings>(
  {
    oneQuestionAtATime: { type: Boolean, default: true },
    showProgressBar: { type: Boolean, default: true },
    allowMultipleSubmissions: { type: Boolean, default: true },
    requireLogin: { type: Boolean, default: false },
    collectIP: { type: Boolean, default: false },

    general: { type: generalSettingsSchema, default: undefined },
    emailSettings: { type: formEmailSettingsSchema, default: undefined },
    access: { type: accessSettingsSchema, default: undefined },
    hiddenFields: { type: hiddenFieldsSettingsSchema, default: undefined },
    variables: {
      type: [variableSchema],
      default: () => DEFAULT_FORM_VARIABLES.map((v) => ({ ...v })),
    },
  },
  subDoc
);

/**
 * Complete defaults for a freshly created form/version. Kept in one place so
 * the Form document, the FormVersion snapshot and the API responses always
 * agree on the shape.
 */
export const buildDefaultFormSettings = (): IFormSettings => ({
  oneQuestionAtATime: true,
  showProgressBar: true,
  allowMultipleSubmissions: true,
  requireLogin: false,
  collectIP: false,

  general: {
    show_progress_bar: true,
    initial_loader: true,
    navigation_arrows: true,
    refill_link: { isActive: false, link: "" },
    show_powered_by_company_name: true,
    anonymous_survey: false,
  },

  emailSettings: {
    receive_email_notification: false,
    multiple_recipients: { isActive: false, emails: [] },
    reply_to: {
      automatic_first_email_field: false,
      custom_email: { isActive: false, address: "" },
    },
    email_subject: "",
    email_body: "",
  },

  access: {
    close_form: false,
    close_form_by_date: { isActive: false, date: null },
    close_form_by_submissions: { isActive: false, submissions: 0 },
    auto_refresh_inactivity: { isActive: false, minutes: 5 },
    preventDuplicateSubmissions: false,
    detectionMethod: "cookie_ip",
    responseLimit: { type: "single", count: 1, period: "lifetime" },
  },

  hiddenFields: { enabled: false, fields: [] },
  variables: DEFAULT_FORM_VARIABLES.map((v) => ({ ...v })),
});

/** Recursively turns Mongoose documents/sub-documents into plain objects. */
const toPlainObject = (value: any): any => {
  if (Array.isArray(value)) return value.map(toPlainObject);
  if (value && typeof value.toObject === "function") return value.toObject();
  return value;
};

/**
 * Ensures the default variables (`score`, `price`) are always available:
 * defaults are inserted first, then stored variables with the same name
 * override them, and extra custom variables are appended.
 */
export const resolveVariableDefaults = (stored?: any): IVariable[] => {
  const byName = new Map<string, IVariable>();
  for (const variable of DEFAULT_FORM_VARIABLES) {
    byName.set(variable.name, { ...variable });
  }
  for (const item of toPlainObject(stored ?? [])) {
    if (item && typeof item === "object" && typeof item.name === "string") {
      byName.set(item.name, item);
    }
  }
  return Array.from(byName.values());
};

/**
 * Fills any missing group with its defaults so callers always receive a
 * complete, plain settings object — even when the stored value is a Mongoose
 * sub-document (a fresh `FormVersion` document) or a legacy document created
 * before a group existed. Never serializes Mongoose internals (`$__`, `_doc`,
 * `$isNew`, `$__parent`, ...).
 */
export const normalizeFormSettings = (stored: any): IFormSettings => {
  const defaults = buildDefaultFormSettings();
  const raw = toPlainObject(stored);
  if (!raw || typeof raw !== "object") return defaults;

  const mergeGroup = (group: keyof IFormSettings) => {
    const storedGroup = toPlainObject(raw[group]);
    const defaultGroup = toPlainObject(defaults[group]);
    if (!storedGroup || typeof storedGroup !== "object") return defaultGroup;
    return { ...defaultGroup, ...storedGroup };
  };

  return {
    ...defaults,
    ...raw,
    general: mergeGroup("general"),
    emailSettings: mergeGroup("emailSettings"),
    access: mergeGroup("access"),
    hiddenFields: mergeGroup("hiddenFields"),
    variables: resolveVariableDefaults(raw.variables),
  };
};

const emailSettingsSchema = new Schema<IEmailPageSettings>(
  {
    businessEmailsOnly: { type: Boolean, default: false },
    emailVerification: { type: Boolean, default: false },
  },
  subDoc
);

const phoneSettingsSchema = new Schema<IPhonePageSettings>(
  {
    phoneVerification: { type: Boolean, default: false },
    countryCodeMode: {
      type: String,
      enum: countryCodeModes,
      default: "auto",
    },
    defaultCountry: {
      iso2: { type: String, default: "" },
      name: { type: String, default: "" },
      dialCode: { type: String, default: "" },
    },
  },
  subDoc
);

const statementSettingsSchema = new Schema<IStatementPageSettings>(
  {
    embedUrl: { type: String, default: "" },
    embedProvider: { type: String, enum: embedProviders },
    embedTitle: { type: String, default: "" },
  },
  subDoc
);

const choiceSettingsSchema = new Schema<IChoicePageSettings>(
  {
    allowOther: { type: Boolean, default: false },
    otherLabel: { type: String, default: "Other" },
    horizontalAlign: { type: Boolean, default: false },
    optionsPerRow: {
      desktop: { type: Number, default: DEFAULT_OPTIONS_PER_ROW_DESKTOP },
      mobile: { type: Number, default: DEFAULT_OPTIONS_PER_ROW_MOBILE },
    },
    hideLabels: { type: Boolean, default: false },
    selectionLimit: {
      mode: { type: String, enum: selectionLimitModes, default: "none" },
      exact: { type: Number },
      min: { type: Number },
      max: { type: Number },
    },
  },
  subDoc
);

const addressSubPageSchema = new Schema<IAddressSubPage>(
  {
    key: { type: String, enum: addressPageKeys, required: true },
    label: { type: String, required: true },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    order: { type: Number, required: true },
  },
  subDoc
);

const addressSettingsSchema = new Schema<IAddressPageSettings>(
  {
    pages: { type: [addressSubPageSchema], default: () => defaultAddressPages },
  },
  subDoc
);

const ratingSettingsSchema = new Schema<IRatingPageSettings>(
  {
    style: { type: String, enum: ratingStyles, default: DEFAULT_RATING_STYLE },
    max: { type: Number, default: DEFAULT_RATING_MAX },
  },
  subDoc
);

const opinionScaleSettingsSchema = new Schema<IOpinionScalePageSettings>(
  {
    min: { type: Number, default: DEFAULT_SCALE_MIN },
    max: { type: Number, default: DEFAULT_SCALE_MAX },
    leftLabel: { type: String, default: "" },
    rightLabel: { type: String, default: "" },
  },
  subDoc
);

const uploadSettingsSchema = new Schema<IUploadPageSettings>(
  {
    allowMultiple: { type: Boolean, default: false },
    allowedFileTypes: {
      type: [String],
      default: [],
      validate: {
        validator: (values: string[]) =>
          values.every((value) => allowedFileTypeValues.includes(value)),
        message: "Unsupported file type",
      },
    },
    maxFileSizeMb: { type: Number, default: DEFAULT_MAX_UPLOAD_SIZE_MB },
  },
  subDoc
);

const matrixEntrySchema = new Schema<IMatrixEntry>(
  {
    key: { type: String, required: true },
    label: { type: String, default: "" },
    order: { type: Number, required: true },
  },
  subDoc
);

const matrixSettingsSchema = new Schema<IMatrixPageSettings>(
  {
    rows: { type: [matrixEntrySchema], default: [] },
    columns: { type: [matrixEntrySchema], default: [] },
    allowMultiplePerRow: { type: Boolean, default: false },
  },
  subDoc
);

/**
 * Only the group relevant to the page's type is populated; the rest stay
 * `undefined` so documents don't carry unrelated settings.
 */
const pageSettingsSchema = new Schema<IPageSettings>(
  {
    email: { type: emailSettingsSchema, default: undefined },
    phone: { type: phoneSettingsSchema, default: undefined },
    statement: { type: statementSettingsSchema, default: undefined },
    choice: { type: choiceSettingsSchema, default: undefined },
    address: { type: addressSettingsSchema, default: undefined },
    rating: { type: ratingSettingsSchema, default: undefined },
    opinionScale: { type: opinionScaleSettingsSchema, default: undefined },
    upload: { type: uploadSettingsSchema, default: undefined },
    matrix: { type: matrixSettingsSchema, default: undefined },
  },
  subDoc
);

/* -------------------------------------------------------------------------- */
/* End page sub-schemas                                                       */
/* -------------------------------------------------------------------------- */

const endPageEmbedSchema = new Schema<IEndPageEmbed>(
  {
    url: { type: String, default: "" },
    provider: { type: String, enum: embedProviders },
    title: { type: String, default: "" },
  },
  subDoc
);

const endPageButtonSchema = new Schema<IEndPageButton>(
  {
    text: { type: String, default: "" },
    link: { type: String, default: "" },
  },
  subDoc
);

const endPageRedirectSchema = new Schema<IEndPageRedirect>(
  {
    isRedirect: { type: Boolean, default: false },
    link: { type: String, default: "" },
  },
  subDoc
);

const endPageSocialShareMediaSchema = new Schema<IEndPageSocialShareMedia>(
  {
    facebook: { type: Boolean, default: false },
    twitter: { type: Boolean, default: false },
    linkedin: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
  },
  subDoc
);

export const endPageSchema = new Schema<IEndPage>(
  {
    key: { type: String, default: "" },
    title: { type: String, default: "Thank you!" },
    helperText: { type: String, default: "" },
    paragraph: { type: String, default: "" },
    coverImage: { type: coverImageSchema, default: undefined },
    embed: { type: endPageEmbedSchema, default: () => ({ url: "" }) },
    alignment: { type: String, enum: contentAlignments, default: DEFAULT_ALIGNMENT },
    button: {
      type: endPageButtonSchema,
      default: () => ({ text: "", link: "" }),
    },
    redirect: {
      type: endPageRedirectSchema,
      default: () => ({ isRedirect: false, link: "" }),
    },
    showConfetti: { type: Boolean, default: false },
    socialShareButtons: { type: Boolean, default: false },
    socialShareMessage: { type: String, default: "" },
    socialShareMedia: {
      type: endPageSocialShareMediaSchema,
      default: () => ({
        facebook: false,
        twitter: false,
        linkedin: false,
        whatsapp: false,
      }),
    },
    order: { type: Number, default: 1 },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/* Page + form schemas                                                       */
/* -------------------------------------------------------------------------- */

const formPageSchema = new Schema<IFormPage>(
  {
    pageKey: { type: String, required: true },
    label: { type: String, required: true },
    helperText: { type: String, default: "" },
    placeholder: { type: String, default: "" },

    type: {
      type: String,
      enum: pageTypes,
      required: true,
    },

    required: { type: Boolean, default: false },
    order: { type: Number, required: true },

    coverImage: { type: coverImageSchema, default: undefined },

    options: [
      {
        label: { type: String },
        value: { type: String },
      },
    ],

    validation: {
      minLength: { type: Number },
      maxLength: { type: Number },
      min: { type: Number },
      max: { type: Number },
      pattern: { type: String },
      message: { type: String },
    },

    settings: { type: pageSettingsSchema, default: () => ({}) },

    logic: [
      {
        whenPageKey: { type: String },
        operator: {
          type: String,
          enum: logicOperators,
        },
        value: { type: Schema.Types.Mixed },
        action: {
          type: String,
          enum: logicActions,
        },
        targetPageKey: { type: String },
      },
    ],

    appearance: {
      width: { type: String, enum: ["full", "half"], default: "full" },
      icon: { type: String, default: "" },
      submitButtonText: { type: String, default: "" },
      submitButtonColor: { type: String, default: "" },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const formSchema = new Schema<IForm>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: formStatusValues,
      default: formStatus.DRAFT,
    },

    draftVersionId: { type: Schema.Types.ObjectId, ref: "FormVersion" },
    publishedVersionId: { type: Schema.Types.ObjectId, ref: "FormVersion", default: null },
    hasUnpublishedChanges: { type: Boolean, default: false },

    theme: { type: formThemeSchema, default: () => ({}) },

    settings: { type: formSettingsSchema, default: () => buildDefaultFormSettings() },

    pages: [formPageSchema],
    endPages: [endPageSchema],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Form = mongoose.model<IForm>("Form", formSchema);
