# Puter V0 Spec

Puter is the front door for agent-driven work. It coordinates work; it does not execute work.

## Roles

- Linear owns task intent and workflow state.
- GitHub owns source code, branches, PRs, review comments, and merge history.
- Puter owns intake, claims, workpads, handoffs, and conflict routing.
- Symphony, Codex, Claude Code, EC2 workers, GitHub Actions, and humans execute work.

## Core Flow

```txt
source event -> puter intake -> Linear issue -> claim -> agent work -> handoff -> review
```

## V0 State Model

Default state names:

- `Backlog`: captured, not agent-ready.
- `Todo`: ready for agent dispatch.
- `In Progress`: claimed/running.
- `Blocked`: external dependency or missing permission.
- `In Review`: output is ready for human review.
- `Done`, `Canceled`, `Duplicate`: terminal.

Custom Linear workflows can map these names in `puter.config.json`.

## Durable Store

V0 has no database. Linear is the durable store.

Claim state is stored in one Linear comment:

```md
## Puter Workpad
<!-- puter:workpad v1 issue=PUT-123 claim=uuid -->
```

Restarting Puter does not lose coordination state because active workpads remain in Linear.

## Conflict Detection

On claim, Puter checks active issues in the same project and parses their workpads. It returns `409 Conflict` when requested areas overlap an active workpad's areas.

Path overlap is hierarchical:

- `apps/api` conflicts with `apps/api/src/routes`
- `apps/api` does not conflict with `apps/cli`

V0 creates a Backlog integration issue when a conflict is detected.

## Non-Goals

- No agent execution.
- No merge automation.
- No database.
- No replacement for Linear or GitHub.
- No private Lucky9-only assumptions in core code.
