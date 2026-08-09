import { IFormTheme, IThemeBackgroundImage, IThemeFont } from "../../models/Form";
import {
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
} from "../../constants/theme";
import { UpdateFormThemeBody } from "./form.types";

/** A brand-new form's appearance, and the base every stored theme is filled in against. */
export const defaultFormTheme = (): IFormTheme => ({
  primaryColor: DEFAULT_PRIMARY_COLOR,
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  textColor: DEFAULT_TEXT_COLOR,
  questionColor: DEFAULT_QUESTION_COLOR,
  answerColor: DEFAULT_ANSWER_COLOR,
  buttonColor: DEFAULT_BUTTON_COLOR,
  buttonTextColor: DEFAULT_BUTTON_TEXT_COLOR,
  alignment: DEFAULT_ALIGNMENT,
  fontSize: DEFAULT_FONT_SIZE,
  roundCorners: DEFAULT_CORNER_RADIUS,
  backgroundImage: undefined,
  font: { ...DEFAULT_THEME_FONT },
});

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A stored theme may arrive as a Mongoose subdocument, whose own enumerable
 * keys are not the data. Normalise to a plain object before merging.
 */
const toPlainObject = (value: unknown): Record<string, any> | undefined => {
  if (!isPlainObject(value)) return undefined;
  const maybeDoc = value as { toObject?: () => Record<string, any> };
  return typeof maybeDoc.toObject === "function" ? maybeDoc.toObject() : value;
};

/** Drops `undefined` values so an absent key never overwrites a stored one. */
const pickDefined = (source: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
};

const buildFont = (base: IThemeFont, incoming: unknown): IThemeFont => {
  const provided = toPlainObject(incoming);
  const font: IThemeFont = provided
    ? { ...base, ...pickDefined(provided) }
    : { ...base };

  // A URL only ever belongs to an uploaded font file; switching back to a
  // system or Google family must not leave the old file behind.
  if (font.source !== "custom") {
    delete font.url;
  }
  return font;
};

const buildBackgroundImage = (
  base: IThemeBackgroundImage | undefined,
  incoming: unknown
): IThemeBackgroundImage | undefined => {
  // Explicit null (or an empty url) removes the image along with its
  // brightness/tile options, which are meaningless without one.
  if (incoming === null) return undefined;

  const provided = toPlainObject(incoming);
  if (!provided) return base ? { ...base } : undefined;

  const merged: IThemeBackgroundImage = {
    url: "",
    brightness: DEFAULT_THEME_BRIGHTNESS,
    tile: false,
    ...(base || {}),
    ...pickDefined(provided),
  };

  return merged.url ? merged : undefined;
};

/**
 * Produce the theme object to persist.
 *
 * `stored` is filled in against the defaults first, so forms created before a
 * property existed still return a complete theme. `incoming` is then applied on
 * top; omitted keys keep their stored value.
 */
export const buildFormTheme = (
  stored?: IFormTheme | Record<string, any> | null,
  incoming?: UpdateFormThemeBody | Record<string, any> | null
): IFormTheme => {
  const base: IFormTheme = {
    ...defaultFormTheme(),
    ...pickDefined(toPlainObject(stored) || {}),
  };

  base.font = buildFont(defaultFormTheme().font, toPlainObject(stored)?.font);
  base.backgroundImage = buildBackgroundImage(
    undefined,
    toPlainObject(stored)?.backgroundImage
  );

  const update = toPlainObject(incoming);
  if (!update) return base;

  const { font, backgroundImage, ...scalars } = update;

  const theme: IFormTheme = { ...base, ...pickDefined(scalars) };
  theme.font = buildFont(base.font, font);
  theme.backgroundImage =
    "backgroundImage" in update
      ? buildBackgroundImage(base.backgroundImage, backgroundImage)
      : base.backgroundImage;

  return theme;
};
