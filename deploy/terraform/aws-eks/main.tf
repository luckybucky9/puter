resource "helm_release" "puter" {
  name             = "puter"
  namespace        = var.namespace
  create_namespace = true
  chart            = "${path.module}/../../helm/puter"

  set {
    name  = "image.repository"
    value = var.image_repository
  }

  set {
    name  = "image.tag"
    value = var.image_tag
  }

  set {
    name  = "secrets.existingSecret"
    value = var.existing_secret
  }
}
