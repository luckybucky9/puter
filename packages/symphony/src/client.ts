export interface SymphonyRefreshResult {
  ok: boolean;
  status: number;
  body?: unknown;
}

export class SymphonyClient {
  constructor(private readonly token = process.env.SYMPHONY_REFRESH_TOKEN) {}

  async refresh(refreshUrl: string): Promise<SymphonyRefreshResult> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.token) {
      headers.authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(refreshUrl, {
      method: "POST",
      headers,
      body: "{}"
    });

    const text = await response.text();
    let body: unknown = text;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    return { ok: response.ok, status: response.status, body };
  }
}
