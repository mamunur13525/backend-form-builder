import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";
import { FormStatus, formStatus, formStatusValues } from "../constants/status";
import {
  addressFieldKeys,
  allowedFileTypeValues,
  countryCodeModes,
  defaultAddressFields,
  DEFAULT_MAX_UPLOAD_SIZE_MB,
  DEFAULT_OPTIONS_PER_ROW_DESKTOP,
  DEFAULT_OPTIONS_PER_ROW_MOBILE,
  DEFAULT_RATING_MAX,
  DEFAULT_RATING_STYLE,
  DEFAULT_SCALE_MAX,
  DEFAULT_SCALE_MIN,
  embedProviders,
  fieldTypes,
  FieldType,
  logicActions,
  logicOperators,
  ratingStyles,
  selectionLimitModes,
} from "../constants/fieldTypes";
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

/** Cover image is available on every field type. */
export interface ICoverImage {
  url: string;
  fileId?: string;
  alt?: string;
}

export interface IFieldOption {
  label?: string;
  value?: string;
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
 * Styles the whole form, every page included. Per-field overrides live in
 * `IFormField.appearance`.
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

export interface IEmailFieldSettings {
  /** Reject free/consumer mail providers (gmail.com, yahoo.com, ...). */
  businessEmailsOnly: boolean;
  /** Send a verification code to the address before accepting the answer. */
  emailVerification: boolean;
}

export interface IPhoneFieldSettings {
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

export interface IStatementFieldSettings {
  /** Any embeddable link: YouTube, Loom, Vimeo, PDF, ... */
  embedUrl: string;
  embedProvider?: (typeof embedProviders)[number];
  embedTitle?: string;
}

export interface IChoiceFieldSettings {
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

export interface IAddressSubField {
  key: (typeof addressFieldKeys)[number];
  label: string;
  placeholder: string;
  required: boolean;
  hidden: boolean;
  order: number;
}

export interface IAddressFieldSettings {
  fields: IAddressSubField[];
}

export interface IRatingFieldSettings {
  /** `star` renders stars, `number` renders a numeric range. */
  style: "star" | "number";
  /** Highest selectable rating. */
  max: number;
}

export interface IOpinionScaleFieldSettings {
  min: number;
  max: number;
  leftLabel: string;
  rightLabel: string;
}

export interface IUploadFieldSettings {
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

export interface IMatrixFieldSettings {
  rows: IMatrixEntry[];
  columns: IMatrixEntry[];
  /** Allow multiple selections per row. */
  allowMultiplePerRow: boolean;
}

export interface IFieldSettings {
  email?: IEmailFieldSettings;
  phone?: IPhoneFieldSettings;
  statement?: IStatementFieldSettings;
  choice?: IChoiceFieldSettings;
  address?: IAddressFieldSettings;
  rating?: IRatingFieldSettings;
  opinionScale?: IOpinionScaleFieldSettings;
  upload?: IUploadFieldSettings;
  matrix?: IMatrixFieldSettings;
}

/* -------------------------------------------------------------------------- */
/* Field                                                                      */
/* -------------------------------------------------------------------------- */

export interface IFormField {
  fieldKey: string;
  label: string;
  helperText: string;
  placeholder: string;
  type: FieldType;
  required: boolean;
  order: number;
  coverImage?: ICoverImage;
  options: IFieldOption[];
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
  settings: IFieldSettings;
  logic: {
    whenFieldKey?: string;
    operator?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value?: any;
    action?: "show" | "hide" | "goToField" | "goToEnd";
    targetFieldKey?: string;
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

export interface IForm extends Document {
  title: string;
  slug: string;
  status: FormStatus;
  draftVersionId?: mongoose.Types.ObjectId;
  publishedVersionId?: mongoose.Types.ObjectId | null;
  hasUnpublishedChanges: boolean;
  theme: IFormTheme;
  settings: {
    oneQuestionAtATime: boolean;
    showProgressBar: boolean;
    allowMultipleSubmissions: boolean;
    requireLogin: boolean;
    collectIP: boolean;
  };
  fields: IFormField[];
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

const emailSettingsSchema = new Schema<IEmailFieldSettings>(
  {
    businessEmailsOnly: { type: Boolean, default: false },
    emailVerification: { type: Boolean, default: false },
  },
  subDoc
);

const phoneSettingsSchema = new Schema<IPhoneFieldSettings>(
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

const statementSettingsSchema = new Schema<IStatementFieldSettings>(
  {
    embedUrl: { type: String, default: "" },
    embedProvider: { type: String, enum: embedProviders },
    embedTitle: { type: String, default: "" },
  },
  subDoc
);

const choiceSettingsSchema = new Schema<IChoiceFieldSettings>(
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

const addressSubFieldSchema = new Schema<IAddressSubField>(
  {
    key: { type: String, enum: addressFieldKeys, required: true },
    label: { type: String, required: true },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    order: { type: Number, required: true },
  },
  subDoc
);

const addressSettingsSchema = new Schema<IAddressFieldSettings>(
  {
    fields: { type: [addressSubFieldSchema], default: () => defaultAddressFields },
  },
  subDoc
);

const ratingSettingsSchema = new Schema<IRatingFieldSettings>(
  {
    style: { type: String, enum: ratingStyles, default: DEFAULT_RATING_STYLE },
    max: { type: Number, default: DEFAULT_RATING_MAX },
  },
  subDoc
);

const opinionScaleSettingsSchema = new Schema<IOpinionScaleFieldSettings>(
  {
    min: { type: Number, default: DEFAULT_SCALE_MIN },
    max: { type: Number, default: DEFAULT_SCALE_MAX },
    leftLabel: { type: String, default: "" },
    rightLabel: { type: String, default: "" },
  },
  subDoc
);

const uploadSettingsSchema = new Schema<IUploadFieldSettings>(
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

const matrixSettingsSchema = new Schema<IMatrixFieldSettings>(
  {
    rows: { type: [matrixEntrySchema], default: [] },
    columns: { type: [matrixEntrySchema], default: [] },
    allowMultiplePerRow: { type: Boolean, default: false },
  },
  subDoc
);

/**
 * Only the group relevant to the field's type is populated; the rest stay
 * `undefined` so documents don't carry unrelated settings.
 */
const fieldSettingsSchema = new Schema<IFieldSettings>(
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
/* Field + form schemas                                                       */
/* -------------------------------------------------------------------------- */

const formFieldSchema = new Schema<IFormField>(
  {
    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    helperText: { type: String, default: "" },
    placeholder: { type: String, default: "" },

    type: {
      type: String,
      enum: fieldTypes,
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

    settings: { type: fieldSettingsSchema, default: () => ({}) },

    logic: [
      {
        whenFieldKey: { type: String },
        operator: {
          type: String,
          enum: logicOperators,
        },
        value: { type: Schema.Types.Mixed },
        action: {
          type: String,
          enum: logicActions,
        },
        targetFieldKey: { type: String },
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

    settings: {
      oneQuestionAtATime: { type: Boolean, default: true },
      showProgressBar: { type: Boolean, default: true },
      allowMultipleSubmissions: { type: Boolean, default: true },
      requireLogin: { type: Boolean, default: false },
      collectIP: { type: Boolean, default: false },
    },

    fields: [formFieldSchema],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Form = mongoose.model<IForm>("Form", formSchema);
