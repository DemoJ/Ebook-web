export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

const API_BASE = "/api";

function extractMessage(details: unknown, status: number) {
  if (!details || typeof details !== "object") return `请求失败（${status}）`;
  const data = details as { detail?: unknown; message?: string; error?: string };
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) return String(data.detail[0].msg);
  if (data.message) return data.message;
  if (data.error) return data.error;
  return `请求失败（${status}）`;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new ApiError(extractMessage(details, response.status), response.status, details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}
