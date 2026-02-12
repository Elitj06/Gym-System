# Deployment Guide

## Quick Start with Docker

```bash
docker-compose up -d
```

## AWS Deployment

1. Configure AWS credentials
2. Run Terraform:
```bash
cd infrastructure/terraform
terraform init
terraform apply
```

## Manual Deployment

See individual service READMEs for manual deployment instructions.
