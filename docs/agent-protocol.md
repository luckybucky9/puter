# Agent Protocol

Agents are execution surfaces. Puter is the coordination surface.

## Before Editing

1. Identify the Linear issue.
2. Claim it:

   ```bash
   puter claim PUT-123 --project puter --surface codex --branch agent/PUT-123-short-title --area apps/api
   ```

3. If the claim returns `409`, do not edit. Follow the returned integration issue.
4. If Puter is unavailable, use the manual fallback workpad described in `AGENTS.md`.

For local tools, prefer the wrapped entrypoint:

```bash
puter exec --surface codex --issue PUT-123 --project puter --area apps/api -- codex
```

Shell hooks from `puter install shell` make plain `codex` and `claude` calls route through this
wrapper. Use `--require-claim` when a repo should never start a wrapped session without Linear work.

## During Work

- Keep scope tied to the Linear issue.
- Use `puter discover` for new work.
- Use `puter conflict` when another active task touches the same area.
- Do not put secrets in workpads, issue bodies, PR descriptions, logs, or examples.

## Handoff

Before final response:

```bash
puter handoff PUT-123 --pr https://github.com/luckybucky9/puter/pull/12 --validation "pnpm test passed"
```

The handoff must include:

- PR or artifact URL
- validation run
- known limitations or blockers

## Manual Fallback

Use only when Puter itself is broken or unreachable:

```md
## Puter Workpad
Mode: manual fallback
Reason: puter unavailable
Owner:
Surface:
Branch:
Areas:
- ...
```

Then file a Puter bug.
