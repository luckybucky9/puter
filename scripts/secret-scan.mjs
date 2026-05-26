#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const patterns = [
  /lin_api_[A-Za-z0-9]+/g,
  /gho_[A-Za-z0-9]+/g,
  /github_pat_[A-Za-z0-9_]+/g,
  /xox[baprs]-[A-Za-z0-9-]+/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----/g,
  /OPENAI_API_KEY=sk-[A-Za-z0-9]+/g
];

let failed = false;
for (const file of walk(root)) {
  if (file.includes("/.git/") || file.includes("/node_modules/") || file.includes("/dist/")) {
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches?.length) {
      console.error(`Potential secret in ${path.relative(root, file)}: ${pattern}`);
      failed = true;
    }
  }
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
