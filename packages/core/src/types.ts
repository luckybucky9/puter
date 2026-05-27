export type WorkSource =
  | "cli"
  | "api"
  | "codex"
  | "claude"
  | "ec2"
  | "github"
  | "symphony"
  | "slack"
  | "voice"
  | "terminal"
  | "other";

export type WorkSurface = "codex" | "claude" | "ec2" | "github" | "symphony" | "terminal" | "other";

export interface ProjectStates {
  backlog: string;
  ready: string;
  claimed: string;
  review: string;
  blocked: string;
  terminal: string[];
}

export interface ProjectConfig {
  linearTeam: string;
  linearProject?: string;
  linearProjectSlug?: string;
  repo?: string;
  symphonyRefreshUrl?: string;
  states?: Partial<ProjectStates>;
}

export interface PuterConfig {
  projects: Record<string, ProjectConfig>;
}

export interface WorkIntent {
  title: string;
  body?: string;
  source: WorkSource;
  actor?: string;
  project: string;
  repo?: string;
  areas?: string[];
  links?: string[];
  ready?: boolean;
  idempotencyKey?: string;
}

export interface ClaimRequest {
  issueId: string;
  project?: string;
  surface: WorkSurface;
  owner?: string;
  branch?: string;
  workspace?: string;
  areas?: string[];
  ttlMinutes?: number;
  force?: boolean;
}

export interface DiscoverRequest {
  parentIssueId: string;
  title: string;
  body?: string;
  areas?: string[];
  links?: string[];
}

export interface ConflictRequest {
  issueId: string;
  conflictsWith: string[];
  reason: string;
  areas?: string[];
}

export interface HandoffRequest {
  issueId: string;
  pr?: string;
  artifact?: string;
  validation?: string;
  notes?: string;
}

export type ExecutionReportStatus = "running" | "failed" | "blocked" | "note";

export interface ExecutionReportRequest {
  issueId: string;
  status: ExecutionReportStatus;
  validation?: string;
  notes?: string;
  command?: string;
  exitCode?: number;
  artifact?: string;
}

export interface CloseRequest {
  issueId: string;
  project?: string;
  state?: string;
  reason?: string;
}

export interface PuterIssue {
  id: string;
  identifier: string;
  title: string;
  url?: string;
  state?: string;
  labels?: string[];
}

export interface Workpad {
  issueId?: string;
  claimId?: string;
  owner?: string;
  surface?: string;
  branch?: string;
  workspace?: string;
  areas: string[];
  plan: string[];
  artifacts: Record<string, string>;
  validation: string[];
  blockers: string[];
}

export interface ConflictMatch {
  issue: PuterIssue;
  overlappingAreas: string[];
}

export class PuterError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "PuterError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
