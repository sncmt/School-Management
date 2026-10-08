import axios from "axios";
import type { ApiErrorBody, ApiErrorIssue } from "./types";

const isApiErrorBody = (body: unknown): body is ApiErrorBody =>
  typeof body === "object" && body !== null && "message" in body && "success" in body;

export type ErrorFallbacks = { generic: string; network: string };

/**
 * The server's message for a failed request, or a fallback when there is none.
 * In components use useErrorMessage(), which passes translated fallbacks.
 */
export const getErrorMessage = (
  error: unknown,
  fallbacks: ErrorFallbacks = {
    generic: "Something went wrong. Please try again.",
    network: "Can't reach the server. Check your connection.",
  },
) => {
  if (axios.isAxiosError(error)) {
    if (isApiErrorBody(error.response?.data)) return error.response.data.message;
    if (!error.response) return fallbacks.network;
  }
  return fallbacks.generic;
};

/** Field errors from a 400 "Validation failed" response, keyed by field path. */
export const getFieldErrors = (error: unknown): Record<string, string> => {
  if (!axios.isAxiosError(error) || !isApiErrorBody(error.response?.data)) return {};

  const issues = error.response.data.errors;
  if (!Array.isArray(issues)) return {};

  return Object.fromEntries(
    (issues as ApiErrorIssue[])
      .filter((issue) => typeof issue?.path === "string")
      .map((issue) => [issue.path, issue.message]),
  );
};

export const getErrorStatus = (error: unknown) =>
  axios.isAxiosError(error) ? error.response?.status : undefined;
