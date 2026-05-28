# GitHub Actions Puter Reporting

GitHub Actions can use the same claim and handoff protocol as local agents through the local
`puter-exec` action.

## Required Setup

Configure repository or environment secrets outside source control:

- `PUTER_API_URL`: public HTTPS URL for the Puter API, for example `https://puter.example.com`.
- `PUTER_API_TOKEN`: bearer token accepted by the Puter API.

Build the workspace packages before invoking the action so the local CLI exists:

```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
  with:
    version: 9.15.0
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm
- run: pnpm install --frozen-lockfile
- run: pnpm build
- uses: ./.github/actions/puter-exec
  with:
    issue: LUC-123
    project: puter
    area: ci
    validation: CI passed lint, typecheck, tests, and secret scan.
    command: pnpm lint && pnpm typecheck && pnpm test && pnpm secret:scan
  env:
    PUTER_API_URL: ${{ vars.PUTER_API_URL }}
    PUTER_API_TOKEN: ${{ secrets.PUTER_API_TOKEN }}
```

If the command exits `0`, the action records a Puter handoff and moves the issue to In Review. If it
fails, `puter exec --handoff-on-exit` appends a failure report to the Puter Workpad and leaves the
issue claimed so the board does not drift silently.

Prefer passing `issue` explicitly from workflow inputs or PR metadata. Branch inference only works
when the checked-out branch name contains an issue identifier such as `LUC-123`.
