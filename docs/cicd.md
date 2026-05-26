# CI/CD

CI/CD should prove Puter is safe to run before publishing an image.

## Pull Request Checks

- Install with `pnpm install --frozen-lockfile`.
- Run lint.
- Run typecheck.
- Run unit tests.
- Run secret scan.
- Build Docker image as a smoke test.
- Render Helm chart.
- Format/validate Terraform examples where provider setup is available.

## Main Branch

- Build image.
- Push to GHCR:
  - `ghcr.io/lucky9-labs/puter:<sha>`
  - `ghcr.io/lucky9-labs/puter:latest`
- Package Helm chart in a future release workflow.
- Deploy staging in a future environment workflow.

## Release Tags

Future semantic releases should publish:

- GitHub release notes
- Docker tag `vX.Y.Z`
- Helm chart version `X.Y.Z`
- changelog entry

## Required Smoke Test

After deploy:

```bash
curl -f https://puter.example.com/healthz
curl -f https://puter.example.com/readyz
```

Then run a non-mutating `puter context` against a known test issue or a disposable V0 test project.
