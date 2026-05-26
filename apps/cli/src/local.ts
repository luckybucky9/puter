import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, type PuterConfig } from "@lucky9/puter-core";

export interface LocalContext {
  cwd: string;
  configPath?: string;
  config?: PuterConfig;
  repo?: string;
  branch?: string;
  project?: string;
}

export function readLocalContext(cwd = process.cwd()): LocalContext {
  const configPath = findConfigPath(cwd);
  const config = configPath ? loadConfig(configPath) : undefined;
  const repo = git(["config", "--get", "remote.origin.url"], cwd);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  const normalizedRepo = repo ? normalizeGitRemote(repo) : undefined;
  return {
    cwd,
    configPath,
    config,
    repo: normalizedRepo,
    branch,
    project: inferProject(config, normalizedRepo, cwd)
  };
}

export function findConfigPath(cwd = process.cwd()): string | undefined {
  const explicit = process.env.PUTER_CONFIG;
  if (explicit && fs.existsSync(path.resolve(explicit))) {
    return path.resolve(explicit);
  }

  const cwdConfig = path.join(cwd, "puter.config.json");
  if (fs.existsSync(cwdConfig)) {
    return cwdConfig;
  }

  const userConfig = path.join(os.homedir(), ".config", "puter", "config.json");
  if (fs.existsSync(userConfig)) {
    return userConfig;
  }

  return undefined;
}

export function inferProject(config: PuterConfig | undefined, repo: string | undefined, cwd: string): string | undefined {
  if (!config) {
    return undefined;
  }

  if (repo) {
    const match = Object.entries(config.projects).find(([, project]) => project.repo?.toLowerCase() === repo.toLowerCase());
    if (match) {
      return match[0];
    }
  }

  const cwdName = path.basename(cwd).toLowerCase();
  if (config.projects[cwdName]) {
    return cwdName;
  }

  const keys = Object.keys(config.projects);
  return keys.length === 1 ? keys[0] : undefined;
}

export function inferIssueId(branch: string | undefined): string | undefined {
  return branch?.match(/\b[A-Z][A-Z0-9]+-\d+\b/)?.[0];
}

export function normalizeGitRemote(remote: string): string {
  const trimmed = remote.trim();
  const ssh = trimmed.match(/^git@[^:]+:(?<owner>[^/]+)\/(?<repo>.+?)(?:\.git)?$/);
  if (ssh?.groups) {
    return `${ssh.groups.owner}/${ssh.groups.repo.replace(/\.git$/, "")}`;
  }

  try {
    const url = new URL(trimmed);
    return `${url.pathname.replace(/^\//, "").replace(/\.git$/, "")}`;
  } catch {
    return trimmed.replace(/\.git$/, "");
  }
}

export function git(args: string[], cwd: string): string | undefined {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || undefined;
  } catch {
    return undefined;
  }
}
