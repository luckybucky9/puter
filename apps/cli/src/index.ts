#!/usr/bin/env node
import { PuterError } from "@lucky9/puter-core";
import { booleanArg, listArg, numberArg, parseArgs, required, splitCommand, stringArg } from "./args.js";
import { runDoctor } from "./doctor.js";
import { runExec } from "./exec.js";
import { get, post } from "./http.js";
import { runInitRepo } from "./init-repo.js";
import { runInstall } from "./install.js";

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = error instanceof PuterError ? Math.min(error.status, 255) : 1;
});

async function main(): Promise<void> {
  const [command, first, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (command) {
    case "new": {
      if (!first) {
        usage("puter new <title> --project <project>");
      }
      const body = {
        title: first,
        body: stringArg(args, "body"),
        source: stringArg(args, "source") ?? "cli",
        actor: stringArg(args, "actor"),
        project: required(args, "project"),
        repo: stringArg(args, "repo"),
        areas: listArg(args, "area"),
        links: listArg(args, "link"),
        ready: Boolean(args.ready),
        idempotencyKey: stringArg(args, "idempotency-key")
      };
      return print(await post("/v1/intake", body));
    }

    case "claim": {
      if (!first) {
        usage("puter claim <issue-id> --project <project> --surface <surface>");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/claim`, {
          project: stringArg(args, "project"),
          surface: required(args, "surface"),
          owner: stringArg(args, "owner"),
          branch: stringArg(args, "branch"),
          workspace: stringArg(args, "workspace"),
          areas: listArg(args, "area"),
          ttlMinutes: numberArg(args, "ttl"),
          force: Boolean(args.force)
        })
      );
    }

    case "discover": {
      if (!first) {
        usage("puter discover <parent-issue-id> <title>");
      }
      const title = rest.find((item) => !item.startsWith("--"));
      if (!title) {
        usage("puter discover <parent-issue-id> <title>");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/discover`, {
          title,
          body: stringArg(args, "body"),
          areas: listArg(args, "area"),
          links: listArg(args, "link")
        })
      );
    }

    case "conflict": {
      if (!first) {
        usage("puter conflict <issue-id> --with <issue-id> --reason <reason>");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/conflict`, {
          conflictsWith: listArg(args, "with"),
          reason: required(args, "reason"),
          areas: listArg(args, "area")
        })
      );
    }

    case "handoff": {
      if (!first) {
        usage("puter handoff <issue-id> --pr <url> --validation <text>");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/handoff`, {
          pr: stringArg(args, "pr"),
          artifact: stringArg(args, "artifact"),
          validation: stringArg(args, "validation"),
          notes: stringArg(args, "notes")
        })
      );
    }

    case "close": {
      if (!first) {
        usage("puter close <issue-id> [--state <state>] [--reason <text>]");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/close`, {
          project: stringArg(args, "project"),
          state: stringArg(args, "state"),
          reason: stringArg(args, "reason")
        })
      );
    }

    case "cancel": {
      if (!first) {
        usage("puter cancel <issue-id> [--reason <text>]");
      }
      return print(
        await post(`/v1/issues/${encodeURIComponent(first)}/close`, {
          project: stringArg(args, "project"),
          state: stringArg(args, "state") ?? "Canceled",
          reason: stringArg(args, "reason")
        })
      );
    }

    case "context": {
      if (!first) {
        usage("puter context <issue-id>");
      }
      return print(await get(`/v1/issues/${encodeURIComponent(first)}/context`));
    }

    case "refresh": {
      if (!first) {
        usage("puter refresh <project>");
      }
      return print(await post(`/v1/projects/${encodeURIComponent(first)}/refresh`, {}));
    }

    case "doctor":
      return runDoctor();

    case "exec": {
      const split = splitCommand([first, ...rest].filter((value): value is string => Boolean(value)));
      return runExec(split.args, split.command);
    }

    case "install":
      return runInstall(first, args);

    case "init-repo":
      return runInitRepo(parseArgs([first, ...rest].filter((value): value is string => Boolean(value))));

    case "help":
    case undefined:
      return usage();

    default:
      throw new PuterError(1, "unknown_command", `Unknown command: ${command}`);
  }
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(message?: string): never {
  if (message) {
    process.stderr.write(`${message}\n\n`);
  }
  process.stderr.write(`Usage:
  puter new <title> --project <project> [--area <area>] [--ready]
  puter claim <issue-id> --project <project> --surface <surface> [--branch <branch>] [--area <area>]
  puter discover <parent-issue-id> <title> [--area <area>]
  puter conflict <issue-id> --with <issue-id> --reason <reason>
  puter handoff <issue-id> [--pr <url>] [--validation <text>]
  puter close <issue-id> [--state <state>] [--reason <text>]
  puter cancel <issue-id> [--reason <text>]
  puter context <issue-id>
  puter refresh <project>
  puter doctor
  puter exec [--issue <issue-id> | --title <title> | --auto-create] --surface <surface> -- <command>
  puter install bin [--write] [--dir <path>]
  puter install shell [--auto-create] [--require-claim]
  puter install launchd [--write] [--command <command>] [--env <path>]
  puter init-repo [--path <repo>] [--project <project>]
`);
  process.exit(message ? 1 : 0);
}
