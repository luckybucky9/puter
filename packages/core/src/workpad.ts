import { randomUUID } from "node:crypto";
import { normalizeAreas } from "./areas.js";
import type { ClaimRequest, HandoffRequest, Workpad } from "./types.js";

const HEADER = "## Puter Workpad";
const MARKER_RE = /<!-- puter:workpad v1 issue=(?<issue>[^ ]+)(?: claim=(?<claim>[^ ]+))? -->/;

export function isPuterWorkpad(body: string): boolean {
  return body.includes(HEADER) && MARKER_RE.test(body);
}

export function renderClaimWorkpad(claim: ClaimRequest): string {
  const claimId = randomUUID();
  const areas = normalizeAreas(claim.areas);

  return `${HEADER}
<!-- puter:workpad v1 issue=${claim.issueId} claim=${claimId} -->

Owner: ${claim.owner ?? "unknown"}
Surface: ${claim.surface}
Branch: ${claim.branch ?? ""}
Workspace: ${claim.workspace ?? ""}
TTL Minutes: ${claim.ttlMinutes ?? ""}

Areas:
${areas.length > 0 ? areas.map((area) => `- ${area}`).join("\n") : "- unspecified"}

Plan:
- [ ] Define implementation plan
- [ ] Implement scoped changes
- [ ] Validate behavior

Artifacts:
- PR:
- Logs:

Validation:
- [ ] Not recorded yet

Blockers:
- None
`;
}

export function appendHandoffToWorkpad(existing: string, handoff: HandoffRequest): string {
  const lines = [existing.trimEnd(), "", "### Handoff"];

  if (handoff.pr) {
    lines.push(`- PR: ${handoff.pr}`);
  }
  if (handoff.artifact) {
    lines.push(`- Artifact: ${handoff.artifact}`);
  }
  if (handoff.validation) {
    lines.push(`- Validation: ${handoff.validation}`);
  }
  if (handoff.notes) {
    lines.push(`- Notes: ${handoff.notes}`);
  }

  return `${lines.join("\n")}\n`;
}

export function parseWorkpad(body: string): Workpad | null {
  if (!isPuterWorkpad(body)) {
    return null;
  }

  const marker = body.match(MARKER_RE);
  const issueId = marker?.groups?.issue;
  const claimId = marker?.groups?.claim;

  return {
    issueId,
    claimId,
    owner: fieldValue(body, "Owner"),
    surface: fieldValue(body, "Surface"),
    branch: fieldValue(body, "Branch"),
    workspace: fieldValue(body, "Workspace"),
    areas: sectionList(body, "Areas"),
    plan: sectionList(body, "Plan"),
    artifacts: Object.fromEntries(
      sectionList(body, "Artifacts")
        .map((item) => item.replace(/^\[[ x]\]\s*/i, ""))
        .map((item) => {
          const [key, ...rest] = item.split(":");
          return [key.trim(), rest.join(":").trim()];
        })
    ),
    validation: sectionList(body, "Validation"),
    blockers: sectionList(body, "Blockers")
  };
}

function fieldValue(body: string, name: string): string | undefined {
  const match = body.match(new RegExp(`^${escapeRegExp(name)}:\\s*(.*)$`, "m"));
  const value = match?.[1]?.trim();
  return value || undefined;
}

function sectionList(body: string, heading: string): string[] {
  const section = body.match(new RegExp(`^${escapeRegExp(heading)}:\\n(?<items>(?:^- .*(?:\\n|$))+)`, "m"));
  const raw = section?.groups?.items ?? "";
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
