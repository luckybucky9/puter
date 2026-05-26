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
