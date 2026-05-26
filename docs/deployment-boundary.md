# Deployment Boundary

Puter is open source. The public repo owns reusable software and generic self-hosting examples.

## Public Repo Owns

- API, CLI, packages, tests, and docs
- Dockerfile
- Helm chart
- generic Terraform examples
- public CI for build, test, lint, secret scan, and release artifact publishing
- docs for self-hosting Puter

## Public Repo Does Not Own

- Lucky9 production Terraform roots
- Lucky9 cloud CI/CD apply workflows
- Terraform backend config
- `*.tfvars`
- AWS account IDs, hosted-zone IDs, listener ARNs, or private domain config
- Linear/GitHub/OpenAI/AWS tokens
- production deployment history

## Private Deployment Repo

Lucky9-specific cloud deployment lives outside this open-source repo in a private deployment repo.
That repo owns Fargate/SQS/API wiring, environment roots, GitHub OIDC assumptions, and deploy
workflows.

The Terraform under `deploy/terraform` remains example material. It should be copied, wrapped, or
referenced by private infrastructure repos rather than used as the direct production state root.

## Rule

Reusable Puter behavior goes here. Lucky9 runtime state and cloud deployment automation do not.
