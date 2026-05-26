import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { apiUrl, request } from "./http.js";
import { readLocalContext } from "./local.js";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export async function runDoctor(): Promise<void> {
  const checks: Check[] = [];
  const context = readLocalContext();

  checks.push({
    name: "config",
    ok: Boolean(context.configPath && context.config),
    detail: context.configPath ?? "missing; set PUTER_CONFIG or create ~/.config/puter/config.json"
  });

  checks.push({
    name: "project inference",
    ok: Boolean(context.project),
    detail: context.project ?? "missing; pass --project or configure a repo match"
  });

  checks.push({
    name: "linear token",
    ok: Boolean(process.env.LINEAR_API_KEY),
    detail: process.env.LINEAR_API_KEY ? "present" : "missing LINEAR_API_KEY for the API daemon"
  });

  checks.push(commandCheck("git", ["--version"]));
  checks.push(commandCheck("gh", ["--version"]));

  if (context.config) {
    for (const [key, project] of Object.entries(context.config.projects)) {
      const refreshUrl = project.symphonyRefreshUrl;
      checks.push({
        name: `project ${key}`,
        ok: Boolean(project.linearTeam),
        detail: `team=${project.linearTeam}${project.repo ? ` repo=${project.repo}` : ""}${refreshUrl ? ` refresh=${refreshUrl}` : ""}`
      });
      if (refreshUrl) {
        checks.push({
          name: `symphony url ${key}`,
          ok: isHttpUrl(refreshUrl),
          detail: isHttpUrl(refreshUrl) ? refreshUrl : "must be http:// or https://"
        });
      }
    }
  }

  checks.push(await apiCheck("api health", "/healthz"));
  checks.push(await apiCheck("api ready", "/readyz"));

  const width = Math.max(...checks.map((check) => check.name.length), 8);
  for (const check of checks) {
    const mark = check.ok ? "ok" : "fail";
    process.stdout.write(`${mark.padEnd(5)} ${check.name.padEnd(width)} ${check.detail}\n`);
  }

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

function commandCheck(command: string, args: string[]): Check {
  try {
    const output = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n")[0] ?? "present";
    return { name: `${command} cli`, ok: true, detail: output };
  } catch {
    return { name: `${command} cli`, ok: false, detail: "not found in PATH" };
  }
}

async function apiCheck(name: string, path: string): Promise<Check> {
  try {
    await request("GET", path);
    return { name, ok: true, detail: `${apiUrl}${path}` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { name, ok: false, detail };
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function configExists(pathname: string): boolean {
  return fs.existsSync(pathname);
}
