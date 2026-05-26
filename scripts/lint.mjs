#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = ["README.md", "AGENTS.md", "CLAUDE.md", "docs/agent-protocol.md", "docs/deployment.md"];
let failed = false;

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing required file: ${file}`);
    failed = true;
  }
}

for (const file of walk(root)) {
  if (file.includes("/node_modules/") || file.includes("/dist/") || file.includes("/.git/")) {
    continue;
  }
  if (!/\.(ts|js|mjs|md|json|yaml|yml|tf|tpl|sh)$/.test(file)) {
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      console.error(`Trailing whitespace: ${path.relative(root, file)}:${index + 1}`);
      failed = true;
    }
  });
}

process.exit(failed ? 1 : 0);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}
