import { spawn } from "node:child_process";
import { PuterError } from "@lucky9/puter-core";
import { booleanArg, listArg, numberArg, stringArg, type Args } from "./args.js";
import { apiUrl, post } from "./http.js";
import { inferIssueId, readLocalContext } from "./local.js";

interface LinearIssueResponse {
  issue?: {
    identifier?: string;
    id?: string;
    url?: string;
  };
}

export async function runExec(args: Args, command: string[]): Promise<void> {
  if (command.length === 0) {
    throw new PuterError(1, "missing_command", "Usage: puter exec [--issue LUC-123 | --title <title>] --surface <surface> -- <command>");
  }

  const context = readLocalContext();
  const surface = stringArg(args, "surface") ?? "terminal";
  const project = stringArg(args, "project") ?? process.env.PUTER_PROJECT ?? context.project;
  const areas = listArg(args, "area");
  const issueId =
    stringArg(args, "issue") ??
    process.env.PUTER_ISSUE_ID ??
    (booleanArg(args, "infer") ? inferIssueId(context.branch) : undefined);
  const title = stringArg(args, "title");
  const autoCreate = booleanArg(args, "auto-create") || process.env.PUTER_AUTO_CREATE === "1" || process.env.PUTER_AUTO_CREATE === "true";
  const requireClaim = booleanArg(args, "require-claim") || process.env.PUTER_REQUIRE_CLAIM === "1" || process.env.PUTER_REQUIRE_CLAIM === "true";

  let activeIssueId = issueId;
  let claimed = false;

  if (!activeIssueId && (title || autoCreate)) {
    if (!project) {
      throw new PuterError(1, "missing_project", "Cannot auto-create Puter work without --project or project inference.");
    }
    const response = (await post("/v1/intake", {
      title: title ?? defaultTitle(surface, context.repo),
      body: stringArg(args, "body"),
      source: sourceFor(surface),
      actor: stringArg(args, "owner") ?? process.env.USER,
      project,
      repo: stringArg(args, "repo") ?? context.repo,
      areas,
      links: listArg(args, "link"),
      ready: false,
      idempotencyKey: stringArg(args, "idempotency-key")
    })) as LinearIssueResponse;
    activeIssueId = response.issue?.identifier ?? response.issue?.id;
  }

  if (activeIssueId) {
    if (!booleanArg(args, "no-claim")) {
      if (!project) {
        throw new PuterError(1, "missing_project", "Cannot claim Puter work without --project or project inference.");
      }
      await post(`/v1/issues/${encodeURIComponent(activeIssueId)}/claim`, {
        project,
        surface,
        owner: stringArg(args, "owner") ?? process.env.USER,
        branch: stringArg(args, "branch") ?? context.branch,
        workspace: stringArg(args, "workspace") ?? context.cwd,
        areas,
        ttlMinutes: numberArg(args, "ttl"),
        force: booleanArg(args, "force")
      });
      claimed = true;
    }
  } else if (requireClaim) {
    throw new PuterError(1, "missing_issue", "No Linear issue could be inferred. Pass --issue, --title, or --auto-create.");
  } else {
    process.stderr.write("puter: no Linear issue inferred; running without a claim. Pass --issue or --title/--auto-create to report this work.\n");
  }

  const exitCode = await spawnChild(command, {
    ...process.env,
    PUTER_API_URL: apiUrl,
    PUTER_PROJECT: project ?? "",
    PUTER_SURFACE: surface,
    PUTER_ISSUE_ID: activeIssueId ?? "",
    PUTER_CLAIMED: claimed ? "1" : "0"
  });

  if (claimed && booleanArg(args, "handoff-on-exit") && activeIssueId && exitCode === 0) {
    await post(`/v1/issues/${encodeURIComponent(activeIssueId)}/handoff`, {
      pr: stringArg(args, "handoff-pr"),
      artifact: stringArg(args, "handoff-artifact"),
      validation: stringArg(args, "handoff-validation") ?? `Command exited 0: ${command.join(" ")}`,
      notes: stringArg(args, "handoff-notes") ?? "Recorded automatically by puter exec --handoff-on-exit."
    });
  } else if (claimed && booleanArg(args, "handoff-on-exit") && exitCode !== 0) {
    if (activeIssueId) {
      await post(`/v1/issues/${encodeURIComponent(activeIssueId)}/report`, {
        status: "failed",
        exitCode,
        command: command.join(" "),
        validation: `Command exited ${exitCode}: ${command.join(" ")}`,
        notes: "Recorded automatically by puter exec --handoff-on-exit; leaving issue claimed for follow-up instead of handoff."
      });
    }
    process.stderr.write(`puter: child exited ${exitCode}; leaving ${activeIssueId ?? "issue"} claimed for follow-up instead of handoff.\n`);
  }

  process.exitCode = exitCode;
}

function defaultTitle(surface: string, repo: string | undefined): string {
  const scope = repo ?? "local workspace";
  return `Ad hoc ${surface} session in ${scope}`;
}

function sourceFor(surface: string): string {
  if (["cli", "api", "codex", "claude", "ec2", "github", "slack", "voice", "terminal"].includes(surface)) {
    return surface;
  }
  return "other";
}

function spawnChild(command: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0]!, command.slice(1), {
      stdio: "inherit",
      env
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) {
        resolve(128);
      } else {
        resolve(code ?? 0);
      }
    });
  });
}
