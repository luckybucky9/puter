variable "github_org" {
  description = "GitHub organization allowed to assume the deploy role."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository allowed to assume the deploy role."
  type        = string
  default     = "puter"
}

variable "role_name" {
  description = "IAM role name for GitHub Actions deployments."
  type        = string
  default     = "puter-github-deploy"
}

variable "allowed_branch" {
  description = "Branch allowed to deploy."
  type        = string
  default     = "main"
}
