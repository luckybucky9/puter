# Deployment

Puter V0 is stateless. It can run as a local process, a single container, or a Kubernetes Deployment.

## Container

```bash
docker build -t puter:local .
docker run --env-file .env -p 8787:8787 puter:local
```

## Kubernetes

Use the Helm chart:

```bash
helm upgrade --install puter deploy/helm/puter \
  --namespace puter \
  --create-namespace \
  --set image.repository=ghcr.io/lucky9-labs/puter \
  --set image.tag=latest
```

Secrets should be provided through an existing Kubernetes Secret:

```txt
LINEAR_API_KEY
GITHUB_TOKEN
PUTER_API_TOKEN
SYMPHONY_REFRESH_TOKEN
```

## AWS

Terraform examples live in:

- `deploy/terraform/github-oidc`: GitHub Actions deploy identity.
- `deploy/terraform/aws-ecs`: ECS Fargate shape.
- `deploy/terraform/aws-eks`: EKS/Helm shape.

The Terraform directories are intended as examples and should be copied or wrapped for production infrastructure.

## CI/CD

Main branch CI should:

1. install dependencies
2. typecheck
3. test
4. run secret scan
5. build container
6. lint Helm chart
7. validate Terraform examples
8. publish image to GHCR on `main`
