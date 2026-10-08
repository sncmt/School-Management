import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { getErrorMessage, getFieldErrors } from "@/lib/api/errors";

/**
 * Puts a failed request's errors on the form: field errors from a 400
 * "Validation failed" go under their fields, anything else is returned as the
 * form-level message.
 */
export const applyServerErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null => {
  const fieldErrors = getFieldErrors(error);
  let placed = false;

  for (const field of fields) {
    if (fieldErrors[field]) {
      setError(field, { message: fieldErrors[field] });
      placed = true;
    }
  }
  return placed ? null : getErrorMessage(error);
};
