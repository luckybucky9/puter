import { PuterError } from "@lucky9/puter-core";

export const apiUrl = process.env.PUTER_API_URL ?? "http://127.0.0.1:8787";
const apiToken = process.env.PUTER_API_TOKEN;

export async function get(path: string): Promise<unknown> {
  return request("GET", path);
}

export async function post(path: string, body: unknown): Promise<unknown> {
  return request("POST", path, body);
}

export async function request(method: string, path: string, body?: unknown): Promise<unknown> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiToken) {
    headers.authorization = `Bearer ${apiToken}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    const error = parsed as { error?: { code?: string; message?: string; details?: unknown } };
    throw new PuterError(response.status, error.error?.code ?? "request_failed", error.error?.message ?? `HTTP ${response.status}`, error.error?.details);
  }
  return parsed;
}
