#!/usr/bin/env node
import { PuterError } from "@lucky9/puter-core";

type Args = Record<string, string | boolean | string[]>;

const apiUrl = process.env.PUTER_API_URL ?? "http://127.0.0.1:8787";
const apiToken = process.env.PUTER_API_TOKEN;

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = error instanceof PuterError ? Math.min(error.status, 255) : 1;
});

async function main(): Promise<void> {
  const [command, first, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (command) {
    case "new": {
      if (!first) {
        usage("puter new <title> --project <project>");
      }
      const body = {
        title: first,
        body: stringArg(args, "body"),
        source: stringArg(args, "source") ?? "cli",
        actor: stringArg(args, "actor"),
        project: required(args, "project"),
        repo: stringArg(args, "repo"),
        areas: listArg(args, "area"),
        links: listArg(args, "link"),
        ready: Boolean(args.ready),
        idempotencyKey: stringArg(args, "idempotency-key")
      };
      return print(await post("/v1/intake", body));
    }

    case "claim": {
      if (!first) {
        usage("puter claim <issue-id> --project <project> --surface <surface>");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/claim`, {
          project: stringArg(args, "project"),
          surface: required(args, "surface"),
          owner: stringArg(args, "owner"),
          branch: stringArg(args, "branch"),
          workspace: stringArg(args, "workspace"),
          areas: listArg(args, "area"),
          ttlMinutes: numberArg(args, "ttl"),
          force: Boolean(args.force)
        })
      );
    }

    case "discover": {
      if (!first) {
        usage("puter discover <parent-issue-id> <title>");
      }
      const title = rest.find((item) => !item.startsWith("--"));
      if (!title) {
        usage("puter discover <parent-issue-id> <title>");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/discover`, {
          title,
          body: stringArg(args, "body"),
          areas: listArg(args, "area"),
          links: listArg(args, "link")
        })
      );
    }

    case "conflict": {
      if (!first) {
        usage("puter conflict <issue-id> --with <issue-id> --reason <reason>");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/conflict`, {
          conflictsWith: listArg(args, "with"),
          reason: required(args, "reason"),
          areas: listArg(args, "area")
        })
      );
    }

    case "handoff": {
      if (!first) {
        usage("puter handoff <issue-id> --pr <url> --validation <text>");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/handoff`, {
          pr: stringArg(args, "pr"),
          artifact: stringArg(args, "artifact"),
          validation: stringArg(args, "validation"),
          notes: stringArg(args, "notes")
        })
      );
    }

    case "context": {
      if (!first) {
        usage("puter context <issue-id>");
      }
      return print(await get(`/v1/issues/${encodeURIComponent(first)}/context`));
    }

    case "refresh": {
      if (!first) {
        usage("puter refresh <project>");
      }
      return print(await post(`/v1/projects/${encodeURIComponent(first)}/refresh`, {}));
    }

    case "help":
    case undefined:
      return usage();

    default:
      throw new PuterError(1, "unknown_command", `Unknown command: ${command}`);
  }
}

async function get(path: string): Promise<unknown> {
  return request("GET", path);
}

async function post(path: string, body: unknown): Promise<unknown> {
  return request("POST", path, body);
}

async function request(method: string, path: string, body?: unknown): Promise<unknown> {
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
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = parsed as { error?: { code?: string; message?: string; details?: unknown } };
    throw new PuterError(response.status, error.error?.code ?? "request_failed", error.error?.message ?? `HTTP ${response.status}`, error.error?.details);
  }
  return parsed;
}

function parseArgs(values: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < values.length; i += 1) {
    const token = values[i];
    if (!token?.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = values[i + 1];
    const value = !next || next.startsWith("--") ? true : next;
    if (value !== true) {
      i += 1;
    }
    if (out[key] === undefined) {
      out[key] = value;
    } else if (Array.isArray(out[key])) {
      (out[key] as string[]).push(String(value));
    } else {
      out[key] = [String(out[key]), String(value)];
    }
  }
  return out;
}

function stringArg(args: Args, name: string): string | undefined {
  const value = args[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

function listArg(args: Args, name: string): string[] {
  const value = args[name];
  if (Array.isArray(value)) {
    return value.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function numberArg(args: Args, name: string): number | undefined {
  const value = stringArg(args, name);
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function required(args: Args, name: string): string {
  const value = stringArg(args, name);
  if (!value) {
    throw new PuterError(1, "missing_arg", `Missing --${name}`);
  }
  return value;
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(message?: string): never {
  if (message) {
    process.stderr.write(`${message}\n\n`);
  }
  process.stderr.write(`Usage:
  puter new <title> --project <project> [--area <area>] [--ready]
  puter claim <issue-id> --project <project> --surface <surface> [--branch <branch>] [--area <area>]
  puter discover <parent-issue-id> <title> [--area <area>]
  puter conflict <issue-id> --with <issue-id> --reason <reason>
  puter handoff <issue-id> [--pr <url>] [--validation <text>]
  puter context <issue-id>
  puter refresh <project>
`);
  process.exit(message ? 1 : 0);
}
