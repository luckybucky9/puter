resource "aws_cloudwatch_log_group" "puter" {
  name              = "/puter/${var.name}"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "puter" {
  name = var.name
}

resource "aws_iam_role" "task_execution" {
  name = "${var.name}-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "puter" {
  family                   = var.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution.arn

  container_definitions = jsonencode([{
    name      = "puter"
    image     = var.container_image
    essential = true
    portMappings = [{
      containerPort = 8787
      protocol      = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.puter.name
        awslogs-region        = data.aws_region.current.name
        awslogs-stream-prefix = "puter"
      }
    }
  }])
}

resource "aws_ecs_service" "puter" {
  name            = var.name
  cluster         = aws_ecs_cluster.puter.id
  task_definition = aws_ecs_task_definition.puter.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }
}

data "aws_region" "current" {}
