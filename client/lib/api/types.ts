// Mirrors the server's sendResponse and globalErrorHandler bodies.

export type ApiMeta = {
  page: number;
  limit: number;
  total: number;
};

export type ApiResponse<T> = {
  success: true;
  message: string;
  meta?: ApiMeta;
  data: T;
};

export type ApiErrorIssue = {
  path: string;
  message: string;
  code?: string;
};

export type ApiErrorBody = {
  success: false;
  status: string;
  statusCode: number;
  message: string;
  errors?: unknown;
};
