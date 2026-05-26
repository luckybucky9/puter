import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PuterError } from "@lucky9/puter-core";
import { booleanArg, stringArg, type Args } from "./args.js";
import { apiUrl } from "./http.js";

export async function runInstall(target: string | undefined, args: Args): Promise<void> {
  switch (target) {
    case "bin":
      return installBin(args);
    case "shell":
      return installShell(args);
    case "launchd":
      return installLaunchd(args);
    default:
      throw new PuterError(1, "unknown_install_target", "Usage: puter install <bin|shell|launchd>");
  }
}

function installBin(args: Args): void {
  const binDir = stringArg(args, "dir") ?? path.join(os.homedir(), ".local", "bin");
  const binPath = path.join(binDir, "puter");
  const script = `#!/bin/sh
exec ${shellWord(process.execPath)} ${shellWord(process.argv[1] ?? "")} "$@"
`;

  if (booleanArg(args, "write")) {
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(binPath, script, { mode: 0o755 });
    process.stdout.write(`${binPath}\n`);
    return;
  }

  process.stdout.write(script);
}

function installShell(args: Args): void {
  const autoCreate = booleanArg(args, "auto-create");
  const requireClaim = booleanArg(args, "require-claim");
  const extra = [autoCreate ? "--auto-create" : "", requireClaim ? "--require-claim" : ""].filter(Boolean).join(" ");
  const extraWithSpace = extra ? `${extra} ` : "";

  process.stdout.write(`# Puter shell hooks
export PUTER_API_URL="${shellQuote(apiUrl)}"

codex() {
  puter exec --surface codex --infer ${extraWithSpace}-- codex "$@"
}

claude() {
  puter exec --surface claude --infer ${extraWithSpace}-- claude "$@"
}

puter-terminal() {
  puter exec --surface terminal --infer ${extraWithSpace}-- "$@"
}
`);
}

function installLaunchd(args: Args): void {
  const label = stringArg(args, "label") ?? "com.lucky9.puter";
  const plistPath = path.join(os.homedir(), "Library", "LaunchAgents", `${label}.plist`);
  const envFile = stringArg(args, "env") ?? path.join(os.homedir(), ".config", "puter", "puter.env");
  const command = stringArg(args, "command") ?? defaultDaemonCommand(envFile);
  const configPath = process.env.PUTER_CONFIG ?? path.join(os.homedir(), ".config", "puter", "config.json");
  const logRoot = path.join(os.homedir(), "Library", "Logs", "puter");
  const plist = renderLaunchdPlist(label, command, configPath, logRoot);

  if (booleanArg(args, "write")) {
    fs.mkdirSync(path.dirname(plistPath), { recursive: true });
    fs.mkdirSync(logRoot, { recursive: true });
    fs.writeFileSync(plistPath, plist);
    process.stdout.write(`${plistPath}\n`);
    return;
  }

  process.stdout.write(plist);
}

function defaultDaemonCommand(envFile: string): string {
  return `if [ -f ${shellWord(envFile)} ]; then set -a; source ${shellWord(envFile)}; set +a; fi; cd ${shellWord(process.cwd())} && pnpm --filter @lucky9/puter-api start`;
}

function renderLaunchdPlist(label: string, command: string, configPath: string, logRoot: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>${xml(command)}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PUTER_HOST</key>
    <string>${xml(process.env.PUTER_HOST ?? "127.0.0.1")}</string>
    <key>PUTER_PORT</key>
    <string>${xml(process.env.PUTER_PORT ?? "8787")}</string>
    <key>PUTER_CONFIG</key>
    <string>${xml(configPath)}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xml(path.join(logRoot, "puter.out.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${xml(path.join(logRoot, "puter.err.log"))}</string>
</dict>
</plist>
`;
}

function shellQuote(value: string): string {
  return value.replace(/"/g, '\\"');
}

function shellWord(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function xml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
