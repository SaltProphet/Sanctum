/**
 * Safe JSON parsing utilities for API requests and responses
 */

export async function parseResponseBodyAsJson(response: Response): Promise<unknown | null> {
 * Safely parses JSON from a Response object.
 * Returns null if parsing fails instead of throwing an error.
 * 
 * @param response - The Response object to parse
 * @returns The parsed JSON object, or null if parsing fails
 */
export async function parseJsonResponse(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function parseRequestBodyAsJson(request: Request): Promise<unknown | null> {
/**
 * Safely parses JSON from a Request object.
 * Returns null if parsing fails instead of throwing an error.
 * 
 * @param request - The Request object to parse
 * @returns The parsed JSON object, or null if parsing fails
 */
export async function parseJsonRequest(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Validates that a value is a non-empty string.
 * 
 * @param value - The value to validate
 * @param allowEmpty - Whether to allow empty strings (default: false)
 * @returns true if the value is a string and meets the empty check requirement
 */
export function isValidString(value: unknown, allowEmpty = false): value is string {
  return typeof value === 'string' && (allowEmpty || value.length > 0);
}
