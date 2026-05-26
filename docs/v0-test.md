# V0 Effectiveness Test

V0 is effective if Puter can safely coordinate multiple entry points and workers without manual babysitting.

## Test Setup

- Linear project: `Puter V0 Test`
- GitHub disposable repo with:
  - `app/onboarding.md`
  - `app/billing.md`
- Local Puter API
- Two fake workers or two terminal sessions

## Scenario

1. Create work from CLI.
2. Create work from HTTP.
3. Create work from a webhook-shaped payload.
4. Claim one onboarding issue from worker A.
5. Attempt to claim another onboarding issue from worker B.
6. Claim a billing issue from worker C.
7. Discover follow-up work.
8. Handoff work with a PR URL and validation.

## Passing Criteria

- Different ingress paths create normalized Linear issues.
- Claim writes a durable `## Puter Workpad`.
- Conflicting claims return `409` and create/link an integration issue.
- Non-conflicting claims proceed.
- Discovered work defaults to Backlog.
- Handoff links artifact/PR and moves issue to In Review.
- Restarting Puter does not lose active claim context.
- No secrets appear in issue bodies, workpads, PRs, logs, or API responses.
