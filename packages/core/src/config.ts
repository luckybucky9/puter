import fs from "node:fs";
import path from "node:path";
import type { ProjectConfig, PuterConfig } from "./types.js";
import { PuterError } from "./types.js";

export function loadConfig(configPath = process.env.PUTER_CONFIG ?? "puter.config.json"): PuterConfig {
  const absolute = path.resolve(configPath);
  if (!fs.existsSync(absolute)) {
    throw new PuterError(500, "missing_config", `Puter config not found at ${absolute}`);
  }

  const parsed = JSON.parse(fs.readFileSync(absolute, "utf8")) as PuterConfig;
  if (!parsed.projects || typeof parsed.projects !== "object") {
    throw new PuterError(500, "invalid_config", "Config must contain a projects object.");
  }

  return parsed;
}

export function requireProject(config: PuterConfig, key: string): ProjectConfig {
  const project = config.projects[key];
  if (!project) {
    throw new PuterError(404, "unknown_project", `Unknown project: ${key}`);
  }
  if (!project.linearTeam) {
    throw new PuterError(500, "invalid_project", `Project ${key} is missing linearTeam.`);
  }
  return project;
}
