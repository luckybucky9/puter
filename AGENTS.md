# Agent Instructions

Puter dogfoods its own protocol.

Before editing:

1. Identify or create a Linear issue for the work.
2. Claim it through Puter when Puter is available:

   ```bash
   puter claim PUT-123 --project puter --surface codex --branch agent/PUT-123-short-title --area <area>
   ```

3. If Puter is broken or unavailable, use manual fallback by creating/updating a Linear comment with:

   ```md
   ## Puter Workpad
   Mode: manual fallback
   Reason: puter unavailable
   ```

4. Do not start code edits after a `409 Conflict`; work the returned integration issue or ask for routing.

During work:

- Keep the Puter workpad current.
- Use `puter discover` for follow-up work; discovered work defaults to Backlog.
- Keep secrets out of issues, comments, PRs, logs, and fixtures.
- Keep changes narrowly scoped to the issue.

Before handoff:

- Run relevant validation.
- Open/link a PR or artifact.
- Use `puter handoff` to record the PR and validation.
- Move work to In Review only when output is ready for human review.

Core areas:

- `apps/api`
- `apps/cli`
- `packages/core`
- `packages/linear`
- `packages/github`
- `packages/symphony`
- `deploy/helm`
- `deploy/terraform`
- `docs`
- `ci`

<!-- puter:agent-protocol:start -->
## Puter Coordination

Before editing, claim the Linear issue through Puter:

```bash
puter claim <issue-id> --project puter --surface <codex|claude|terminal|github|ec2> --area <path>
```

For wrapped local sessions, start the tool through Puter:

```bash
puter exec --surface codex --issue <issue-id> --project puter -- codex
```

If Puter returns a conflict, do not edit. Follow the returned integration issue.

Before handoff, record the result:

```bash
puter handoff <issue-id> --pr <url> --validation "<command passed>"
```
<!-- puter:agent-protocol:end -->
