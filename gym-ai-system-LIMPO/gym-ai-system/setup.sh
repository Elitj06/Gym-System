#!/bin/bash

# ============================================
# Gym AI System - Setup Automatizado
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║      🏋️  GYM AI SYSTEM - SETUP AUTOMATIZADO          ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar pré-requisitos
echo -e "${BLUE}[1/7]${NC} Verificando pré-requisitos..."

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js não encontrado. Instale: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node --version)"

# Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗${NC} Python3 não encontrado. Instale: https://python.org/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Python $(python3 --version)"

# Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Docker não encontrado. Instalação manual necessária."
    echo "  Instale Docker: https://docker.com/"
else
    echo -e "${GREEN}✓${NC} Docker $(docker --version)"
fi

# Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Docker Compose não encontrado."
else
    echo -e "${GREEN}✓${NC} Docker Compose $(docker-compose --version)"
fi

echo ""

# Configurar .env
echo -e "${BLUE}[2/7]${NC} Configurando variáveis de ambiente..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Arquivo .env criado"
    echo -e "${YELLOW}⚠${NC} IMPORTANTE: Edite o arquivo .env com suas configurações!"
    read -p "Pressione ENTER para continuar..."
else
    echo -e "${YELLOW}⚠${NC} Arquivo .env já existe"
fi

echo ""

# Instalar dependências do Backend
echo -e "${BLUE}[3/7]${NC} Instalando dependências do Backend..."
cd backend
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Dependências do Backend instaladas"
else
    echo -e "${RED}✗${NC} package.json não encontrado no backend"
fi
cd ..

echo ""

# Instalar dependências do AI Vision
echo -e "${BLUE}[4/7]${NC} Instalando dependências do AI Vision..."
cd ai-vision
if [ -f "requirements.txt" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    deactivate
    echo -e "${GREEN}✓${NC} Dependências do AI Vision instaladas"
else
    echo -e "${RED}✗${NC} requirements.txt não encontrado no ai-vision"
fi
cd ..

echo ""

# Instalar dependências do Web Dashboard
echo -e "${BLUE}[5/7]${NC} Instalando dependências do Web Dashboard..."
cd web-dashboard
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Dependências do Web Dashboard instaladas"
else
    echo -e "${RED}✗${NC} package.json não encontrado no web-dashboard"
fi
cd ..

echo ""

# Verificar Docker
echo -e "${BLUE}[6/7]${NC} Verificando configuração Docker..."

if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker está rodando"
        
        read -p "Deseja iniciar os containers agora? [y/N]: " start_docker
        if [[ $start_docker =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Iniciando containers...${NC}"
            docker-compose up -d
            echo -e "${GREEN}✓${NC} Containers iniciados"
            
            echo ""
            echo "Aguardando serviços iniciarem..."
            sleep 10
            
            echo ""
            echo "Status dos containers:"
            docker-compose ps
        fi
    else
        echo -e "${YELLOW}⚠${NC} Docker daemon não está rodando"
    fi
else
    echo -e "${YELLOW}⚠${NC} Docker não está instalado"
fi

echo ""

# Resumo
echo -e "${BLUE}[7/7]${NC} Setup concluído!"
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETO!                     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Edite o arquivo .env com suas configurações"
echo "2. Inicie os serviços:"
echo "   ${GREEN}docker-compose up -d${NC}"
echo ""
echo "3. Acesse:"
echo "   • Backend API:     http://localhost:3000"
echo "   • Web Dashboard:   http://localhost:3001"
echo "   • AI Vision:       http://localhost:5000"
echo "   • Grafana:         http://localhost:3002"
echo ""
echo "4. Teste o sistema:"
echo "   ${GREEN}curl http://localhost:3000/health${NC}"
echo ""
echo "📚 Documentação:"
echo "   • README.md - Visão geral"
echo "   • QUICKSTART.md - Guia rápido"
echo "   • docs/API.md - Documentação da API"
echo "   • docs/ARCHITECTURE.md - Arquitetura"
echo ""
echo "❓ Precisa de ajuda?"
echo "   • GitHub: https://github.com/Elitj06/Gym-Sisten/issues"
echo "   • Email: elitjader@gmail.com"
echo ""
echo -e "${GREEN}Boa sorte! 🚀${NC}"
echo ""
