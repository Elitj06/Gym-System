terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "gym-ai-vpc"
  }
}

# Subnets
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "gym-ai-public-${count.index + 1}"
  }
}

# EC2 Instance for Backend
resource "aws_instance" "backend" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  
  tags = {
    Name = "gym-ai-backend"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier        = "gym-ai-db"
  engine            = "postgres"
  engine_version    = "14.7"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  
  db_name  = "gym_db"
  username = "gym_user"
  password = var.db_password
  
  skip_final_snapshot = true
}

# S3 Bucket
resource "aws_s3_bucket" "uploads" {
  bucket = "gym-ai-uploads"
  
  tags = {
    Name = "gym-ai-uploads"
  }
}
