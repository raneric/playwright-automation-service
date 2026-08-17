/**
 * Generic Result type for operations that can fail.
 * Forces callers to explicitly handle both success and failure paths.
 *
 * @template T - The success value type
 * @template E - The error type (defaults to Error)
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/** Convenience result constructors */
export const Result = {
  ok<T, E = Error>(value: T): Result<T, E> {
    return { success: true, value };
  },

  fail<T, E = Error>(error: E): Result<T, E> {
    return { success: false, error };
  },
};
