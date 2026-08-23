import { FormStatus } from "../../constants/status";
import {
  IEndPage,
  IFormSettings,
  IFormTheme,
} from "../../models/Form";
import {
  ContentAlignment,
  CornerRadius,
  FontSize,
  ThemeFontSource,
} from "../../constants/theme";

export interface CreateFormBody {
  title: string;
}

export interface UpdateFormBody {
  title?: string;
}

export interface UpdateFormSettingsBody {
  oneQuestionAtATime?: boolean;
  showProgressBar?: boolean;
  allowMultipleSubmissions?: boolean;
  requireLogin?: boolean;
  collectIP?: boolean;
}

export interface ThemeBackgroundImageBody {
  url?: string;
  fileId?: string;
  alt?: string;
  brightness?: number;
  tile?: boolean;
}

export interface ThemeFontBody {
  family?: string;
  source?: ThemeFontSource;
  url?: string;
}

export interface UpdateFormThemeBody {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  questionColor?: string;
  answerColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  alignment?: ContentAlignment;
  fontSize?: FontSize;
  roundCorners?: CornerRadius;
  /** `null` removes the background image and its brightness/tile options. */
  backgroundImage?: ThemeBackgroundImageBody | null;
  font?: ThemeFontBody;
}

export interface UpdateFormShareBody {
  isPublic?: boolean;
  password?: string;
  expiresAt?: string;
}

export interface FormResponse {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  draftVersionId?: string;
  publishedVersionId?: string | null;
  hasUnpublishedChanges?: boolean;
  version?: number;
  theme: IFormTheme;
  settings: IFormSettings;
  pages: {}[];
  endPages?: IEndPage[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
