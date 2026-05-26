# Puter

Puter is a work ingress and coordination layer for agent-driven development.

It does not run agents. It normalizes work from CLI, HTTP, Codex, Claude Code, EC2 workers, GitHub Actions, Slack, or voice shortcuts into Linear and GitHub so agent work can be claimed, linked, handed off, and conflict-routed consistently.

```txt
sources -> puter -> Linear + GitHub -> Symphony / agents
```

## V0 Contract

- Linear owns task intent and state.
- GitHub owns code, branches, PRs, and review history.
- Symphony, Codex, Claude Code, EC2 workers, and humans execute work.
- Puter owns intake, claims, durable workpad comments, handoff links, and conflict detection.
- V0 is stateless: Linear workpads are the durable store.

## Local Runtime

```bash
pnpm install
cp .env.example .env
cp puter.config.example.json puter.config.json
pnpm build
pnpm dev
```

Health checks:

```bash
curl http://127.0.0.1:8787/healthz
curl http://127.0.0.1:8787/readyz
```

CLI examples:

```bash
pnpm --filter @lucky9/puter-cli puter new "Fix onboarding bug" --project puter --area apps/api --ready
pnpm --filter @lucky9/puter-cli puter claim PUT-123 --surface codex --branch agent/PUT-123-onboarding --area apps/api
pnpm --filter @lucky9/puter-cli puter handoff PUT-123 --pr https://github.com/luckybucky9/puter/pull/12 --validation "pnpm test passed"
pnpm --filter @lucky9/puter-cli puter close PUT-123 --reason "Validation passed"
```

Local shell hooks:

```bash
eval "$(puter install shell)"
puter exec --surface codex --issue PUT-123 --project puter -- codex
puter doctor
```

## API

```http
POST /v1/intake
POST /v1/issues/:id/claim
POST /v1/issues/:id/discover
POST /v1/issues/:id/conflict
POST /v1/issues/:id/handoff
POST /v1/issues/:id/close
GET  /v1/issues/:id/context
POST /v1/projects/:project/refresh
```

See [docs/api.md](docs/api.md).

## Install Path

The repeatable local path is:

```txt
node apps/cli/dist/index.js install bin --write
puter install launchd --write
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.lucky9.puter.plist
eval "$(puter install shell)"
puter init-repo --project <project>
```

After that, `codex` and `claude` shell calls can route through `puter exec`, which claims or creates Linear work before launching the underlying tool.

## Deployment

- Local: `pnpm dev` or `docker compose up`
- Kubernetes: [deploy/helm/puter](deploy/helm/puter)
- AWS examples: [deploy/terraform](deploy/terraform)

See [docs/deployment.md](docs/deployment.md).

Lucky9's hosted Puter deployment is intentionally separate from this open-source repo. This repo
contains the product, generic deploy examples, and public CI; account-specific cloud CI/CD belongs in
a private deployment repo. See [docs/deployment-boundary.md](docs/deployment-boundary.md).

## Agent Protocol

Agents and humans working in this repo should start with [AGENTS.md](AGENTS.md) and [docs/agent-protocol.md](docs/agent-protocol.md).

## License

Apache-2.0
