export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body) headers.set("Content-Type", "application/json");
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        typeof data.message === "string"
          ? data.message
          : `Request failed (${response.status}). Check your inputs and access.`,
      );
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}
