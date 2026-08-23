import {
  DetectionMethod,
  IResponseLimit,
  IVariable,
  ResponseLimitPeriod,
  ResponseLimitType,
} from "../../models/Form";

/** The settings groups that can be edited independently. */
export type SettingsSection =
  | "general"
  | "emailSettings"
  | "access"
  | "hiddenFields"
  | "variables";

export interface UpdateGeneralSettingsBody {
  show_progress_bar?: boolean;
  initial_loader?: boolean;
  navigation_arrows?: boolean;
  refill_link?: {
    isActive?: boolean;
    link?: string;
  };
  show_powered_by_company_name?: boolean;
  anonymous_survey?: boolean;
}

export interface UpdateEmailSettingsBody {
  receive_email_notification?: boolean;
  multiple_recipients?: {
    isActive?: boolean;
    emails?: string[];
  };
  reply_to?: {
    automatic_first_email_field?: boolean;
    custom_email?: {
      isActive?: boolean;
      address?: string;
    };
  };
  email_subject?: string;
  email_body?: string;
}

export interface UpdateAccessSettingsBody {
  close_form?: boolean;
  close_form_by_date?: {
    isActive?: boolean;
    date?: string | Date | null;
  };
  close_form_by_submissions?: {
    isActive?: boolean;
    submissions?: number;
  };
  auto_refresh_inactivity?: {
    isActive?: boolean;
    minutes?: number;
  };
  preventDuplicateSubmissions?: boolean;
  detectionMethod?: DetectionMethod;
  responseLimit?: Partial<IResponseLimit>;
}

export interface UpdateHiddenFieldsBody {
  enabled?: boolean;
  fields?: {
    key?: string;
    value?: string;
  }[];
}

export interface UpdateVariablesBody {
  variables: IVariable[];
}

/** Whatever a section-level read/write returns to the client. */
export interface SettingsResult {
  formId: string;
  settings: any;
  hasUnpublishedChanges: boolean;
}

export type { ResponseLimitPeriod, ResponseLimitType };