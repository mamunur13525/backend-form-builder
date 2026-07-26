export interface ResponseAnswer {
  fieldKey: string;
  label: string;
  type: string;
  value: any;
}

export interface UpdateResponseBody {
  answers?: ResponseAnswer[];
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  };
}

export interface ResponseStats {
  totalResponses: number;
  uniqueRespondents: number;
  todayResponses: number;
  averageCompletionTime?: number;
  completionRate: number;
}