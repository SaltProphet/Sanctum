/**
 * Safe JSON parsing utilities for API requests and responses
 */

export async function parseResponseBodyAsJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function parseRequestBodyAsJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
