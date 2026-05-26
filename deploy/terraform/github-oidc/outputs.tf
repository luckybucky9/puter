output "role_arn" {
  description = "Role ARN for GitHub Actions."
  value       = aws_iam_role.deploy.arn
}
