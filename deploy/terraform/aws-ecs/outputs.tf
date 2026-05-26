output "cluster_name" {
  value = aws_ecs_cluster.puter.name
}

output "service_name" {
  value = aws_ecs_service.puter.name
}
