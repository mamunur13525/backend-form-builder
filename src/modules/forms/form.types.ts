export interface CreateFormBody {
  title: string;
  description?: string;
}

export interface UpdateFormBody {
  title?: string;
  description?: string;
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
  description: string;
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
