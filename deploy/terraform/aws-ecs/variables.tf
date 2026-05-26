variable "name" {
  description = "Service name."
  type        = string
  default     = "puter"
}

variable "container_image" {
  description = "Container image to run."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for ECS tasks."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups for ECS tasks."
  type        = list(string)
}

variable "task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate task memory MiB."
  type        = number
  default     = 512
}
