import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "apps", "cli", "dist", "index.js");

test("usage includes terminal state commands", () => {
  const result = spawnSync("node", [cli], { cwd: root, encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /puter close <issue-id>/);
  assert.match(output, /puter cancel <issue-id>/);
  assert.match(output, /puter report <issue-id>/);
});

test("install shell emits codex and claude wrappers", () => {
  const output = execFileSync("node", [cli, "install", "shell"], { cwd: root, encoding: "utf8" });
  assert.match(output, /codex\(\)/);
  assert.match(output, /puter exec --surface codex --infer -- codex/);
  assert.match(output, /claude\(\)/);
});

test("install bin emits a local puter shim", () => {
  const output = execFileSync("node", [cli, "install", "bin"], { cwd: root, encoding: "utf8" });
  assert.match(output, /^#!\/bin\/sh/);
  assert.match(output, /index\.js' "\$@"/);
});

test("install launchd accepts --env without colliding with node flags", () => {
  const output = execFileSync("node", [cli, "install", "launchd", "--env", "/tmp/puter.env"], { cwd: root, encoding: "utf8" });
  assert.match(output, /\/tmp\/puter\.env/);
  assert.match(output, /com\.lucky9\.puter/);
});

test("doctor checks daemon env files for Linear auth", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "puter-env-"));
  const envFile = path.join(dir, "puter.env");
  fs.writeFileSync(envFile, "LINEAR_API_KEY=dummy-linear-test\n");
  const result = spawnSync("node", [cli, "doctor"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PUTER_ENV: envFile,
      PUTER_API_URL: "http://127.0.0.1:1"
    }
  });
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /linear token\s+present in/);
});

test("exec runs a child command without a claim when no issue is inferred", () => {
  const output = execFileSync("node", [cli, "exec", "--surface", "terminal", "--", "node", "-e", "console.log(process.env.PUTER_CLAIMED)"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(output.trim(), "0");
});

test("init-repo writes an idempotent Puter agent block", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "puter-init-"));
  execFileSync("node", [cli, "init-repo", "--path", dir, "--project", "smoke"], { cwd: root });
  execFileSync("node", [cli, "init-repo", "--path", dir, "--project", "smoke"], { cwd: root });
  const text = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  assert.match(text, /--project smoke/);
  assert.equal(text.match(/puter:agent-protocol:start/g)?.length, 1);
});
