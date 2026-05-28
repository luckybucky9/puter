# Symphony Integration

Puter is the ingress and coordination layer. Symphony is the runner.

## Runtime Relationship

```txt
source -> puter exec/intake -> Linear issue + Puter Workpad
Puter optionally calls Symphony /api/v1/refresh
Symphony polls Puter-ready Linear states
Symphony claims through Puter before editing
Symphony runs Codex inside per-issue workspaces
```

## Workflow Rule

Add this to Symphony project prompts:

```md
Before editing, claim the issue through Puter:

puter claim {{ issue.identifier }} --project puter --surface symphony --branch agent/{{ issue.identifier }}-short-title --area <area>

If Puter returns a conflict, do not edit. Follow the returned integration issue.
```

The repeatable pathway is:

1. `puter exec`, API intake, webhook intake, or a worker creates/claims Linear work.
2. Puter writes a durable `## Puter Workpad` comment.
3. Puter moves ready work into the configured ready state.
4. Puter calls Symphony `/api/v1/refresh` when a project defines `symphonyRefreshUrl`.
5. Symphony fetches ready issues from Linear.
6. Symphony claims through Puter before editing.
7. If Puter returns `409`, Symphony skips execution and follows the integration issue.
8. Handoff returns to Puter/Linear with PR, artifact, validation, and blockers.

Do not treat Symphony refresh as the queue. Linear is the queue; Puter owns claim safety.

## Dispatch Contract

For Puter-backed projects, configure Symphony to treat states this way:

- `Todo`: dispatch queue. Symphony may start work only from this state.
- `In Progress`, `Blocked`, `In Review`: observation states. Symphony may refresh existing runtime
  context for work it already owns, but it must not dispatch fresh work from these states.
- Terminal states such as `Done`, `Canceled`, and `Duplicate`: cleanup/release only.

Before dispatching a `Todo` issue, Symphony should refresh the issue and inspect comments for an
active Puter Workpad:

```md
## Puter Workpad
<!-- puter:workpad v1 issue=LUC-123 claim=... -->
Surface: codex
```

If the workpad surface is present and is not `symphony`, Symphony should skip the issue and log a
clear reason. This keeps direct Codex, terminal, EC2, and GitHub Actions work from being duplicated by
the orchestrator. If there is no Puter Workpad, Symphony may dispatch the issue, but the first agent
step must claim through Puter before code edits.

## Refresh

Configure a project:

```json
{
  "projects": {
    "puter": {
      "linearTeam": "LUC",
      "linearProject": "Puter V0 Local Control Plane",
      "symphonyRefreshUrl": "http://127.0.0.1:4001/api/v1/refresh"
    }
  }
}
```

Then:

```bash
puter refresh puter
```

If Symphony is offline, Puter should preserve the Linear issue and surface the refresh error without deleting the work.
