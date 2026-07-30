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

export interface UpdateFormThemeBody {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
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
  status: string;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  settings: {
    oneQuestionAtATime: boolean;
    showProgressBar: boolean;
    allowMultipleSubmissions: boolean;
    requireLogin: boolean;
    collectIP: boolean;
  };
  fields: {}[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
