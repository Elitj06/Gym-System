#!/usr/bin/env python3
"""
Script para gerar todos os arquivos restantes do projeto Gym AI System
"""

import os
from pathlib import Path

BASE_DIR = Path("/home/claude/gym-ai-system")

# Definir todos os arquivos a serem criados
files_to_create = {
    # Web Dashboard - Arquivos principais
    "web-dashboard/index.html": """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gym AI - Dashboard</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>""",

    "web-dashboard/vite.config.ts": """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})""",

    "web-dashboard/tailwind.config.js": """module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}""",

    "web-dashboard/Dockerfile": """FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]""",

    # Mobile App - React Native
    "mobile-app/package.json": """{
  "name": "gym-ai-mobile",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.3",
    "expo": "~49.0.0",
    "axios": "^1.4.0",
    "socket.io-client": "^4.6.1",
    "@react-navigation/native": "^6.1.7",
    "@react-navigation/stack": "^6.3.17"
  }
}""",

    "mobile-app/App.tsx": """import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gym AI Mobile</Text>
      <Text>Sistema de Gestão Inteligente para Academias</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});""",

    # Database - Scripts SQL
    "database/init.sql": """-- PostgreSQL Database Initialization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    phone VARCHAR(20),
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Gyms Table
CREATE TABLE IF NOT EXISTS gyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    capacity INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'available',
    last_maintenance TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    stream_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_gyms_name ON gyms(name);
CREATE INDEX idx_equipment_gym ON equipment(gym_id);
CREATE INDEX idx_cameras_gym ON cameras(gym_id);
""",

    # Infrastructure - Terraform
    "infrastructure/terraform/main.tf": """terraform {
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
""",

    "infrastructure/terraform/variables.tf": """variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "db_password" {
  description = "Database password"
  sensitive   = true
}
""",

    # Nginx Configuration
    "infrastructure/nginx/nginx.conf": """upstream backend {
    server backend:3000;
}

upstream dashboard {
    server web-dashboard:80;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://dashboard;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
""",

    # Documentation
    "docs/API.md": """# API Documentation

## Authentication

### POST /api/v1/auth/register
Register a new user

### POST /api/v1/auth/login
Login user

## Pose Detection

### POST /api/v1/poses/detect
Detect pose from image

### POST /api/v1/poses/analyze-video
Analyze video for poses

## Analytics

### GET /api/v1/analytics/dashboard
Get dashboard analytics

### GET /api/v1/analytics/heatmap
Get gym heatmap data
""",

    "docs/DEPLOYMENT.md": """# Deployment Guide

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
""",

    # Scripts
    ".gitignore": """# Dependencies
node_modules/
venv/
env/
*.pyc
__pycache__/

# Environment
.env
.env.local

# Logs
logs/
*.log

# Database
*.db
*.sqlite

# Build
dist/
build/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
""",

    "LICENSE": """MIT License

Copyright (c) 2024 Elite Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
""",
}

def create_files():
    """Criar todos os arquivos"""
    print("🚀 Gerando arquivos do projeto...")
    
    for file_path, content in files_to_create.items():
        full_path = BASE_DIR / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ Criado: {file_path}")
    
    print(f"\n✅ {len(files_to_create)} arquivos criados com sucesso!")

if __name__ == "__main__":
    create_files()
