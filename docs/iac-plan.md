# IaC Plan

Puter deployment infrastructure should stay example-driven and portable.

## V0 Targets

1. **Local**: Docker Compose with env-file secrets.
2. **Kubernetes**: Helm chart deployable into any cluster.
3. **AWS ECS**: low-friction Fargate service example.
4. **AWS EKS**: Helm release example.
5. **GitHub OIDC**: deploy identity for CI/CD.

## Secret Model

No secrets are committed.

Runtime secrets:

- `LINEAR_API_KEY`
- `GITHUB_TOKEN`
- `PUTER_API_TOKEN`
- `SYMPHONY_REFRESH_TOKEN`

AWS:

- Store secrets in AWS Secrets Manager or SSM Parameter Store.
- Inject into ECS task definitions or Kubernetes Secrets.

Kubernetes:

- Prefer `secrets.existingSecret`.
- Helm chart should not template literal secrets by default.

## Terraform Modules

Current modules:

- `deploy/terraform/github-oidc`
- `deploy/terraform/aws-ecs`
- `deploy/terraform/aws-eks`

These are intentionally small and copyable. Production users should wrap them in their own network, DNS, TLS, and secret-management modules.

## Promotion

Recommended path:

```txt
PR -> CI checks
main -> build image -> push GHCR sha tag
staging -> smoke test
production -> pin chart image tag to tested sha
```
