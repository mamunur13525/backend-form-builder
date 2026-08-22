import { IPageSettings } from "../../models/Form";
import {
  defaultAddressPages,
  DEFAULT_MAX_UPLOAD_SIZE_MB,
  DEFAULT_OPTIONS_PER_ROW_DESKTOP,
  DEFAULT_OPTIONS_PER_ROW_MOBILE,
  DEFAULT_RATING_MAX,
  DEFAULT_RATING_STYLE,
  DEFAULT_SCALE_MAX,
  DEFAULT_SCALE_MIN,
  PageType,
} from "../../constants/pageTypes";

/** Which settings group a page type owns. Types absent here have no settings. */
const settingsGroupByType: Partial<Record<PageType, keyof IPageSettings>> = {
  email: "email",
  phone: "phone",
  statement: "statement",
  select: "choice",
  multiSelect: "choice",
  radio: "choice",
  checkbox: "choice",
  address: "address",
  rating: "rating",
  opinionScale: "opinionScale",
  file: "upload",
  matrix: "matrix",
};

export const getSettingsGroup = (type: string): keyof IPageSettings | undefined =>
  settingsGroupByType[type as PageType];

const buildDefaults = (group: keyof IPageSettings, type: string): IPageSettings => {
  switch (group) {
    case "email":
      return { email: { businessEmailsOnly: false, emailVerification: false } };

    case "phone":
      return {
        phone: {
          phoneVerification: false,
          countryCodeMode: "auto",
          defaultCountry: { iso2: "", name: "", dialCode: "" },
        },
      };

    case "statement":
      return { statement: { embedUrl: "", embedProvider: undefined, embedTitle: "" } };

    case "choice":
      return {
        choice: {
          allowOther: false,
          otherLabel: "Other",
          horizontalAlign: false,
          optionsPerRow: {
            desktop: DEFAULT_OPTIONS_PER_ROW_DESKTOP,
            mobile: DEFAULT_OPTIONS_PER_ROW_MOBILE,
          },
          hideLabels: false,
          // Selection limits only make sense for multi-answer pages.
          ...(type === "multiSelect" || type === "checkbox"
            ? { selectionLimit: { mode: "none" as const } }
            : {}),
        },
      };

    case "address":
      return { address: { pages: defaultAddressPages.map((f) => ({ ...f })) } };

    case "rating":
      return { rating: { style: DEFAULT_RATING_STYLE, max: DEFAULT_RATING_MAX } };

    case "opinionScale":
      return {
        opinionScale: {
          min: DEFAULT_SCALE_MIN,
          max: DEFAULT_SCALE_MAX,
          leftLabel: "",
          rightLabel: "",
        },
      };

    case "upload":
      return {
        upload: {
          allowMultiple: false,
          allowedFileTypes: [],
          maxFileSizeMb: DEFAULT_MAX_UPLOAD_SIZE_MB,
        },
      };

    case "matrix":
      return { matrix: { rows: [], columns: [], allowMultiplePerRow: false } };

    default:
      return {};
  }
};

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Existing settings may arrive as a Mongoose subdocument, whose own enumerable
 * keys are not the data. Normalise to a plain object before merging.
 */
const toPlainObject = (value: unknown): Record<string, any> | undefined => {
  if (!isPlainObject(value)) return undefined;
  const maybeDoc = value as { toObject?: () => Record<string, any> };
  return typeof maybeDoc.toObject === "function" ? maybeDoc.toObject() : value;
};

/** Shallow-recursive merge where arrays and scalars from `override` win. */
const merge = <T extends Record<string, any>>(base: T, override: Record<string, any>): T => {
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    result[key] = isPlainObject(value) && isPlainObject(base[key])
      ? merge(base[key], value)
      : value;
  }
  return result as T;
};

/**
 * Produce the settings object to persist for a page.
 *
 * Only the group belonging to `type` is kept, so switching a page's type never
 * leaves stale settings behind. Incoming values are merged over the defaults.
 */
export const buildPageSettings = (
  type: string,
  incoming?: IPageSettings | Record<string, any>
): IPageSettings => {
  const group = getSettingsGroup(type);
  if (!group) return {};

  const defaults = buildDefaults(group, type);
  const source = toPlainObject(incoming);
  const provided = toPlainObject(source?.[group]);
  if (!provided) return defaults;

  return { [group]: merge(defaults[group] as Record<string, any>, provided) } as IPageSettings;
};
