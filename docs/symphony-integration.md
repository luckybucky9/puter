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
Before editing, claim the issue through Puter. If Puter returns a conflict, do not edit; follow the integration issue.
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

## Refresh

Configure a project:

```json
{
  "projects": {
    "azalea": {
      "linearTeam": "LUC",
      "linearProject": "Azalea",
      "symphonyRefreshUrl": "http://127.0.0.1:4001/api/v1/refresh"
    }
  }
}
```

Then:

```bash
puter refresh azalea
```

If Symphony is offline, Puter should preserve the Linear issue and surface the refresh error without deleting the work.
