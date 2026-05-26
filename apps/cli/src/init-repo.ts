import fs from "node:fs";
import path from "node:path";
import { stringArg, type Args } from "./args.js";
import { readLocalContext } from "./local.js";

const START = "<!-- puter:agent-protocol:start -->";
const END = "<!-- puter:agent-protocol:end -->";

export function runInitRepo(args: Args): void {
  const repoPath = path.resolve(stringArg(args, "path") ?? process.cwd());
  const context = readLocalContext(repoPath);
  const project = stringArg(args, "project") ?? context.project ?? "<project>";
  const agentFile = path.join(repoPath, "AGENTS.md");
  const existing = fs.existsSync(agentFile) ? fs.readFileSync(agentFile, "utf8") : "# Agent Instructions\n";
  const block = renderBlock(project);
  const next = replaceBlock(existing, block);
  fs.writeFileSync(agentFile, next.endsWith("\n") ? next : `${next}\n`);
  process.stdout.write(`${agentFile}\n`);
}

function renderBlock(project: string): string {
  return `${START}
## Puter Coordination

Before editing, claim the Linear issue through Puter:

\`\`\`bash
puter claim <issue-id> --project ${project} --surface <codex|claude|terminal|github|ec2> --area <path>
\`\`\`

For wrapped local sessions, start the tool through Puter:

\`\`\`bash
puter exec --surface codex --issue <issue-id> --project ${project} -- codex
\`\`\`

If Puter returns a conflict, do not edit. Follow the returned integration issue.

Before handoff, record the result:

\`\`\`bash
puter handoff <issue-id> --pr <url> --validation "<command passed>"
\`\`\`
${END}`;
}

function replaceBlock(existing: string, block: string): string {
  const start = existing.indexOf(START);
  const end = existing.indexOf(END);
  if (start !== -1 && end !== -1 && end > start) {
    return `${existing.slice(0, start).trimEnd()}\n\n${block}\n\n${existing.slice(end + END.length).trimStart()}`;
  }
  return `${existing.trimEnd()}\n\n${block}\n`;
}
