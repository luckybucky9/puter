variable "namespace" {
  description = "Kubernetes namespace for Puter."
  type        = string
  default     = "puter"
}

variable "image_repository" {
  description = "Container image repository."
  type        = string
  default     = "ghcr.io/luckybucky9/puter"
}

variable "image_tag" {
  description = "Container image tag."
  type        = string
  default     = "latest"
}

variable "existing_secret" {
  description = "Kubernetes Secret containing Puter env vars."
  type        = string
  default     = "puter-secrets"
}
