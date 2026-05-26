# API

Base URL defaults to `http://127.0.0.1:8787`.

If `PUTER_API_TOKEN` is set, all `/v1/*` endpoints require:

```http
Authorization: Bearer <token>
```

## Health

```http
GET /healthz
GET /readyz
```

## Intake

```http
POST /v1/intake
```

```json
{
  "title": "Fix onboarding bug",
  "body": "Context and acceptance criteria",
  "source": "cli",
  "actor": "lakshya",
  "project": "puter",
  "repo": "luckybucky9/puter",
  "areas": ["apps/api"],
  "links": ["https://example.com/context"],
  "ready": false,
  "idempotencyKey": "source-event-id"
}
```

`ready: true` creates the issue in the configured ready state. Otherwise the issue is created in Backlog.

## Claim

```http
POST /v1/issues/PUT-123/claim
```

```json
{
  "project": "puter",
  "surface": "codex",
  "owner": "agent-name",
  "branch": "agent/PUT-123-short-title",
  "workspace": "host:/path",
  "areas": ["apps/api"],
  "ttlMinutes": 120
}
```

Returns `409 Conflict` if another active workpad overlaps the same areas.

## Discover

```http
POST /v1/issues/PUT-123/discover
```

Creates a linked follow-up issue in Backlog.

## Conflict

```http
POST /v1/issues/PUT-123/conflict
```

Creates an explicit integration issue.

## Handoff

```http
POST /v1/issues/PUT-123/handoff
```

```json
{
  "pr": "https://github.com/luckybucky9/puter/pull/12",
  "validation": "pnpm test passed",
  "notes": "No known limitations"
}
```

Updates the workpad and moves the issue to the configured review state.

## Context

```http
GET /v1/issues/PUT-123/context
```

Returns the Linear issue plus parsed Puter workpad.

## Symphony Refresh

```http
POST /v1/projects/puter/refresh
```

Calls the configured Symphony `/api/v1/refresh` endpoint if present.
