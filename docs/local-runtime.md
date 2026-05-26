# Local Runtime

## Native

```bash
pnpm install
cp .env.example .env
cp puter.config.example.json puter.config.json
pnpm build
pnpm dev
```

In another shell:

```bash
pnpm --filter @lucky9/puter-cli puter new "Test issue" --project puter --area apps/api
```

## Docker Compose

```bash
cp .env.example .env
cp puter.config.example.json puter.config.json
docker compose up --build
```

The API listens on `http://127.0.0.1:8787`.

## One-Install Local Path

Until packages are published, expose the local CLI from this checkout:

```bash
pnpm build
node apps/cli/dist/index.js install bin --write
export PATH="$HOME/.local/bin:$PATH"
```

Use a user-level config for daily work:

```bash
mkdir -p ~/.config/puter
cp puter.config.example.json ~/.config/puter/config.json
```

Put secrets in your shell profile, a local env loader, or launchd environment. Do not put secrets in
the repo or the config file.

For launchd, use a local env file:

```bash
cat > ~/.config/puter/puter.env <<'EOF'
LINEAR_API_KEY=replace-with-linear-api-key
PUTER_API_TOKEN=replace-with-local-api-token
EOF
chmod 600 ~/.config/puter/puter.env
```

Install the local daemon plist:

```bash
PUTER_CONFIG="$HOME/.config/puter/config.json" puter install launchd --write --env-file "$HOME/.config/puter/puter.env"
launchctl bootstrap "gui/$UID" "$HOME/Library/LaunchAgents/com.lucky9.puter.plist"
launchctl kickstart -k "gui/$UID/com.lucky9.puter"
```

Install shell wrappers:

```bash
eval "$(puter install shell)"
```

For persistent shell hooks:

```bash
puter install shell >> ~/.zshrc
```

The generated functions route local entry points through Puter:

```bash
codex
claude
puter-terminal npm test
```

To require every wrapped session to have a Linear issue:

```bash
eval "$(puter install shell --require-claim)"
```

To allow ad hoc issue creation when no issue can be inferred:

```bash
export PUTER_AUTO_CREATE=true
export PUTER_PROJECT=puter
eval "$(puter install shell --auto-create)"
```

## Command Wrapper

`puter exec` is the primitive that any source can call:

```bash
puter exec --surface codex --issue LUC-16 --project puter --area apps/cli -- codex
puter exec --surface claude --title "Investigate deploy failure" --project puter --area deploy -- claude
puter exec --surface terminal --require-claim --issue LUC-16 -- npm test
```

The wrapper:

- infers the project from `puter.config.json`, `~/.config/puter/config.json`, repo remote, or cwd
- infers an issue from the current git branch when `--infer` is present
- creates work when `--title` or `--auto-create` is present
- claims the issue before launching the child command
- injects `PUTER_ISSUE_ID`, `PUTER_PROJECT`, `PUTER_SURFACE`, and `PUTER_CLAIMED`
- blocks execution on claim conflicts unless `--force` is explicitly passed

Run:

```bash
puter doctor
```

before relying on the wrappers.

## Repo Bootstrap

Add the coordination protocol to any repo:

```bash
puter init-repo --path /path/to/repo --project puter
```

This patches `AGENTS.md` between Puter-managed markers and can be run repeatedly.

## Required Environment

- `LINEAR_API_KEY`: Linear personal API key.
- `PUTER_API_TOKEN`: optional bearer token for API access.
- `GITHUB_TOKEN`: optional token used by GitHub helpers.
- `PUTER_CONFIG`: config file path, default `puter.config.json`.

## Local Files

Do not commit:

- `.env`
- `puter.config.json`
- `logs/`
- `data/`
