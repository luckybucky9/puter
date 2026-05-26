# Symphony Integration

Puter is the ingress and coordination layer. Symphony is the runner.

## Runtime Relationship

```txt
Puter creates/claims Linear issues
Puter optionally calls Symphony /api/v1/refresh
Symphony polls Linear active states
Symphony runs Codex inside per-issue workspaces
```

## Workflow Rule

Add this to Symphony project prompts:

```md
Before editing, claim the issue through Puter. If Puter returns a conflict, do not edit; follow the integration issue.
```

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
