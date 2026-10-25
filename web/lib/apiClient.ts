/**
 * Client-side helper for calling this app's own API routes (app/api/**).
 *
 * Every route answers with `{ success: true, ...payload }` or
 * `{ success: false, error }`. `apiFetch` never throws: network problems,
 * non-JSON responses and HTTP errors all come back as `{ success: false, error }`,
 * so callers only need one `if (result.success)` check.
 *
 * Client-safe: do not import Node-only modules here.
 */

export type ApiFailure = { success: false; error: string };
export type ApiSuccess<T extends object> = { success: true } & T;
export type ApiResult<T extends object> = ApiSuccess<T> | ApiFailure;

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Sent as JSON. Leave undefined for requests without a body. */
  body?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * @typeParam T The payload you expect on success, e.g.
 *   `apiFetch<{ backups: BackupFile[] }>(url)`. It is trusted, not validated.
 */
export async function apiFetch<T extends object = object>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<ApiResult<T>> {
  const { method = 'GET', body } = options;

  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { success: false, error: `Unexpected server response (HTTP ${res.status}).` };
    }

    if (isRecord(data) && data.success === true) {
      return data as unknown as ApiSuccess<T>;
    }

    const message =
      isRecord(data) && typeof data.error === 'string'
        ? data.error
        : `Request failed (HTTP ${res.status}).`;
    return { success: false, error: message };
  } catch {
    return { success: false, error: 'Network error. Check your connection and try again.' };
  }
}
