#!/usr/bin/env node
import http from "node:http";
import {
  activeStateNames,
  appendHandoffToWorkpad,
  loadConfig,
  overlappingAreas,
  parseWorkpad,
  projectStates,
  PuterError,
  renderClaimWorkpad,
  requireProject,
  type ClaimRequest,
  type ConflictMatch,
  type DiscoverRequest,
  type HandoffRequest,
  type PuterConfig,
  type WorkIntent
} from "@lucky9/puter-core";
import { LinearClient, type LinearComment, type LinearIssueNode } from "@lucky9/puter-linear";
import { SymphonyClient } from "@lucky9/puter-symphony";

const host = process.env.PUTER_HOST ?? "127.0.0.1";
const port = Number(process.env.PUTER_PORT ?? "8787");

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => writeError(res, error));
});

server.listen(port, host, () => {
  process.stdout.write(`puter api listening on http://${host}:${port}\n`);
});

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    return writeJson(res, 200, { ok: true });
  }
  if (req.method === "GET" && url.pathname === "/readyz") {
    loadConfig();
    return writeJson(res, 200, { ok: true });
  }

  requireAuth(req);

  if (req.method === "POST" && url.pathname === "/v1/intake") {
    return writeJson(res, 201, await intake(await readJson<WorkIntent>(req)));
  }

  const claimMatch = url.pathname.match(/^\/v1\/issues\/([^/]+)\/claim$/);
  if (req.method === "POST" && claimMatch) {
    return writeJson(res, 200, await claim({ ...(await readJson<Omit<ClaimRequest, "issueId">>(req)), issueId: decodeURIComponent(claimMatch[1] ?? "") }));
  }

  const discoverMatch = url.pathname.match(/^\/v1\/issues\/([^/]+)\/discover$/);
  if (req.method === "POST" && discoverMatch) {
    return writeJson(res, 201, await discover({ ...(await readJson<Omit<DiscoverRequest, "parentIssueId">>(req)), parentIssueId: decodeURIComponent(discoverMatch[1] ?? "") }));
  }

  const conflictMatch = url.pathname.match(/^\/v1\/issues\/([^/]+)\/conflict$/);
  if (req.method === "POST" && conflictMatch) {
    return writeJson(res, 201, await conflict({ ...(await readJson<Omit<import("@lucky9/puter-core").ConflictRequest, "issueId">>(req)), issueId: decodeURIComponent(conflictMatch[1] ?? "") }));
  }

  const handoffMatch = url.pathname.match(/^\/v1\/issues\/([^/]+)\/handoff$/);
  if (req.method === "POST" && handoffMatch) {
    return writeJson(res, 200, await handoff({ ...(await readJson<Omit<HandoffRequest, "issueId">>(req)), issueId: decodeURIComponent(handoffMatch[1] ?? "") }));
  }

  const contextMatch = url.pathname.match(/^\/v1\/issues\/([^/]+)\/context$/);
  if (req.method === "GET" && contextMatch) {
    return writeJson(res, 200, await context(decodeURIComponent(contextMatch[1] ?? "")));
  }

  const refreshMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/refresh$/);
  if (req.method === "POST" && refreshMatch) {
    return writeJson(res, 202, await refresh(decodeURIComponent(refreshMatch[1] ?? "")));
  }

  throw new PuterError(404, "not_found", `No route for ${req.method} ${url.pathname}`);
}

async function intake(intent: WorkIntent): Promise<Record<string, unknown>> {
  if (!intent.title?.trim()) {
    throw new PuterError(400, "invalid_intent", "title is required");
  }
  const config = loadConfig();
  const project = requireProject(config, intent.project);
  const states = projectStates(project);
  const linear = new LinearClient();
  const team = await linear.resolveTeam(project.linearTeam);
  const linearProject = await linear.resolveProject(project);
  const state = await linear.resolveState(team, intent.ready ? states.ready : states.backlog);
  const issue = await linear.createIssue({
    teamId: team.id,
    projectId: linearProject?.id,
    stateId: state.id,
    title: intent.title,
    description: renderIntentDescription(intent)
  });

  if (intent.ready && project.symphonyRefreshUrl) {
    await new SymphonyClient().refresh(project.symphonyRefreshUrl).catch(() => undefined);
  }

  return { issue };
}

async function claim(request: ClaimRequest): Promise<Record<string, unknown>> {
  const config = loadConfig();
  const { projectKey, project } = selectProject(config, request.project);
  const linear = new LinearClient();
  const issue = await linear.getIssue(request.issueId);
  const conflicts = request.force ? [] : await detectConflicts(linear, project, issue.identifier, request.areas ?? []);

  if (conflicts.length > 0) {
    const conflictIssue = await createConflictIssue(linear, project, projectKey, issue, conflicts, request.areas ?? []);
    throw new PuterError(409, "claim_conflict", "Claim overlaps active Puter workpads.", {
      conflicts,
      conflictIssue
    });
  }

  const team = await linear.resolveTeam(project.linearTeam);
  const claimedState = await linear.resolveState(team, projectStates(project).claimed);
  const updated = await linear.updateIssue({ id: issue.id, stateId: claimedState.id });
  const comment = await linear.createComment(issue.id, renderClaimWorkpad(request));
  return { issue: updated, workpad: comment };
}

async function discover(request: DiscoverRequest): Promise<Record<string, unknown>> {
  const config = loadConfig();
  const { project } = selectProject(config, undefined);
  const linear = new LinearClient();
  const parent = await linear.getIssue(request.parentIssueId);
  const team = await linear.resolveTeam(project.linearTeam);
  const linearProject = await linear.resolveProject(project);
  const backlog = await linear.resolveState(team, projectStates(project).backlog);

  const issue = await linear.createIssue({
    teamId: team.id,
    projectId: linearProject?.id,
    stateId: backlog.id,
    title: request.title,
    description: [
      request.body ?? "",
      "",
      `Discovered from ${parent.identifier}: ${parent.url ?? parent.identifier}`,
      request.areas?.length ? `Areas: ${request.areas.join(", ")}` : "",
      request.links?.length ? `Links:\n${request.links.map((link) => `- ${link}`).join("\n")}` : ""
    ]
      .filter(Boolean)
      .join("\n")
  });

  return { issue, parent };
}

async function conflict(request: import("@lucky9/puter-core").ConflictRequest): Promise<Record<string, unknown>> {
  const config = loadConfig();
  const { projectKey, project } = selectProject(config, undefined);
  const linear = new LinearClient();
  const issue = await linear.getIssue(request.issueId);
  const conflictIssues = await Promise.all(request.conflictsWith.map((id) => linear.getIssue(id)));
  const created = await createConflictIssue(
    linear,
    project,
    projectKey,
    issue,
    conflictIssues.map((matched) => ({ issue: matched, overlappingAreas: request.areas ?? [] })),
    request.areas ?? [],
    request.reason
  );
  return { issue: created };
}

async function handoff(request: HandoffRequest): Promise<Record<string, unknown>> {
  const config = loadConfig();
  const { project } = selectProject(config, undefined);
  const linear = new LinearClient();
  const issue = await linear.getIssue(request.issueId);
  const workpad = findWorkpad(issue.comments?.nodes ?? []);

  if (workpad) {
    await linear.updateComment(workpad.id, appendHandoffToWorkpad(workpad.body, request));
  } else {
    await linear.createComment(issue.id, appendHandoffToWorkpad(renderClaimWorkpad({ issueId: request.issueId, surface: "other" }), request));
  }

  const team = await linear.resolveTeam(project.linearTeam);
  const review = await linear.resolveState(team, projectStates(project).review);
  const updated = await linear.updateIssue({ id: issue.id, stateId: review.id });
  return { issue: updated };
}

async function context(issueId: string): Promise<Record<string, unknown>> {
  const issue = await new LinearClient().getIssue(issueId);
  const workpad = findWorkpad(issue.comments?.nodes ?? []);
  return { issue, workpad: workpad ? parseWorkpad(workpad.body) : null };
}

async function refresh(projectKey: string): Promise<Record<string, unknown>> {
  const config = loadConfig();
  const project = requireProject(config, projectKey);
  if (!project.symphonyRefreshUrl) {
    throw new PuterError(404, "missing_symphony_refresh_url", `Project ${projectKey} does not define symphonyRefreshUrl.`);
  }
  const result = await new SymphonyClient().refresh(project.symphonyRefreshUrl);
  return { project: projectKey, result };
}

async function detectConflicts(linear: LinearClient, project: import("@lucky9/puter-core").ProjectConfig, currentIdentifier: string, areas: string[]): Promise<ConflictMatch[]> {
  if (areas.length === 0) {
    return [];
  }
  const issues = await linear.listProjectIssues(project, activeStateNames(project));
  const matches: ConflictMatch[] = [];
  for (const issue of issues) {
    if (issue.identifier === currentIdentifier) {
      continue;
    }
    const workpad = findWorkpad(issue.comments?.nodes ?? []);
    const parsed = workpad ? parseWorkpad(workpad.body) : null;
    const overlap = overlappingAreas(areas, parsed?.areas ?? []);
    if (overlap.length > 0) {
      matches.push({ issue, overlappingAreas: overlap });
    }
  }
  return matches;
}

async function createConflictIssue(
  linear: LinearClient,
  project: import("@lucky9/puter-core").ProjectConfig,
  projectKey: string,
  issue: LinearIssueNode,
  conflicts: ConflictMatch[],
  areas: string[],
  reason = "Overlapping active Puter claims"
): Promise<LinearIssueNode> {
  const team = await linear.resolveTeam(project.linearTeam);
  const linearProject = await linear.resolveProject(project);
  const backlog = await linear.resolveState(team, projectStates(project).backlog);
  return linear.createIssue({
    teamId: team.id,
    projectId: linearProject?.id,
    stateId: backlog.id,
    title: `Integrate ${issue.identifier} with ${conflicts.map((entry) => entry.issue.identifier).join(", ")}`,
    description: [
      "Puter detected overlapping active work.",
      "",
      `Project: ${projectKey}`,
      `Reason: ${reason}`,
      areas.length ? `Areas: ${areas.join(", ")}` : "",
      "",
      `Source: ${issue.url ?? issue.identifier}`,
      "Conflicts:",
      ...conflicts.map((entry) => `- ${entry.issue.url ?? entry.issue.identifier} (${entry.overlappingAreas.join(", ")})`),
      "",
      "Default action: resolve the integration task before allowing parallel edits to continue."
    ]
      .filter(Boolean)
      .join("\n")
  });
}

function findWorkpad(comments: LinearComment[]): LinearComment | undefined {
  return comments.find((comment) => parseWorkpad(comment.body));
}

function selectProject(config: PuterConfig, requested: string | undefined): { projectKey: string; project: import("@lucky9/puter-core").ProjectConfig } {
  if (requested) {
    return { projectKey: requested, project: requireProject(config, requested) };
  }
  const keys = Object.keys(config.projects);
  if (keys.length === 1 && keys[0]) {
    return { projectKey: keys[0], project: config.projects[keys[0]]! };
  }
  throw new PuterError(400, "project_required", "Specify project when config contains multiple projects.");
}

function renderIntentDescription(intent: WorkIntent): string {
  return [
    intent.body ?? "",
    "",
    "## Puter Intake",
    `Source: ${intent.source}`,
    intent.actor ? `Actor: ${intent.actor}` : "",
    intent.repo ? `Repo: ${intent.repo}` : "",
    intent.areas?.length ? `Areas: ${intent.areas.join(", ")}` : "",
    intent.idempotencyKey ? `Idempotency-Key: ${intent.idempotencyKey}` : "",
    intent.links?.length ? `Links:\n${intent.links.map((link) => `- ${link}`).join("\n")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function readJson<T>(req: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? (JSON.parse(body) as T) : ({} as T);
}

function requireAuth(req: http.IncomingMessage): void {
  const token = process.env.PUTER_API_TOKEN;
  if (!token) {
    return;
  }
  const auth = req.headers.authorization ?? "";
  if (auth !== `Bearer ${token}`) {
    throw new PuterError(401, "unauthorized", "Invalid or missing bearer token.");
  }
}

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

function writeError(res: http.ServerResponse, error: unknown): void {
  if (error instanceof PuterError) {
    return writeJson(res, error.status, { error: { code: error.code, message: error.message, details: error.details } });
  }
  const message = error instanceof Error ? error.message : String(error);
  return writeJson(res, 500, { error: { code: "internal_error", message } });
}
