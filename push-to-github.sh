#!/bin/bash

# Script para fazer push do projeto para o GitHub
# Repositório: https://github.com/Elitj06/Gym-Sisten.git

echo "═══════════════════════════════════════════════════════"
echo "  Push para GitHub - Sistema de Gestão de Academias"
echo "═══════════════════════════════════════════════════════"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se Git está instalado
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERRO]${NC} Git não está instalado!"
    echo "Instale o Git primeiro: https://git-scm.com/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Git encontrado: $(git --version)"
echo ""

# Verificar se já é um repositório Git
if [ -d .git ]; then
    echo -e "${YELLOW}[AVISO]${NC} Este diretório já é um repositório Git."
    read -p "Deseja remover e reinicializar? [y/N]: " reset_repo
    if [[ $reset_repo =~ ^[Yy]$ ]]; then
        rm -rf .git
        echo -e "${GREEN}✓${NC} Repositório Git removido"
    fi
fi

# Inicializar repositório
if [ ! -d .git ]; then
    echo -e "${BLUE}[INFO]${NC} Inicializando repositório Git..."
    git init
    echo -e "${GREEN}✓${NC} Repositório inicializado"
fi

# Configurar informações do usuário (se necessário)
if [ -z "$(git config user.name)" ]; then
    echo ""
    echo "Configure suas informações do Git:"
    read -p "Digite seu nome: " git_name
    read -p "Digite seu email: " git_email
    git config user.name "$git_name"
    git config user.email "$git_email"
    echo -e "${GREEN}✓${NC} Configurações salvas"
fi

# Criar .gitignore
echo -e "${BLUE}[INFO]${NC} Criando .gitignore..."
cat > .gitignore <<'EOF'
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.yarn-integrity

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Database
*.db
*.sqlite
*.sqlite3

# Docker
.docker/

# Uploads
uploads/
temp/
tmp/

# Build outputs
dist/
build/
*.egg-info/

# AI Models (muito grandes)
ai-vision/models/*.h5
ai-vision/models/*.pb
ai-vision/models/*.onnx

# Backups
*.bak
*.backup
database/backups/

# OS
.DS_Store
Thumbs.db

# Certificates
*.pem
*.key
*.crt
infrastructure/nginx/ssl/*
EOF

echo -e "${GREEN}✓${NC} .gitignore criado"

# Adicionar remote
echo ""
echo -e "${BLUE}[INFO]${NC} Configurando remote do GitHub..."
REPO_URL="https://github.com/Elitj06/Gym-Sisten.git"

# Remover remote existente se houver
git remote remove origin 2>/dev/null || true

# Adicionar novo remote
git remote add origin "$REPO_URL"
echo -e "${GREEN}✓${NC} Remote configurado: $REPO_URL"

# Criar branch main
echo ""
echo -e "${BLUE}[INFO]${NC} Criando branch main..."
git branch -M main
echo -e "${GREEN}✓${NC} Branch main criada"

# Adicionar todos os arquivos
echo ""
echo -e "${BLUE}[INFO]${NC} Adicionando arquivos ao Git..."
git add .
echo -e "${GREEN}✓${NC} Arquivos adicionados"

# Fazer commit
echo ""
echo -e "${BLUE}[INFO]${NC} Criando commit inicial..."
git commit -m "🎉 Initial commit - Sistema de Gestão Inteligente para Academias

Componentes implementados:
- Backend API (Node.js + TypeScript)
- AI Vision Service (Python + TensorFlow + MediaPipe)
- Mobile App (React Native)
- Web Dashboard (React + TypeScript)
- Infraestrutura AWS (Terraform)
- Docker Compose
- Documentação completa

Features:
✅ Detecção de poses e exercícios em tempo real
✅ Sistema de alertas inteligente
✅ Analytics e mapas de calor
✅ Notificações push
✅ WebSocket para comunicação em tempo real
✅ Dashboard interativo
✅ Infraestrutura escalável
✅ Documentação profissional

Tecnologias:
- Backend: Node.js, Express, TypeScript, Socket.io
- AI/ML: Python, TensorFlow, MediaPipe, OpenCV
- Frontend: React, React Native, Tailwind CSS
- Database: PostgreSQL, Redis, MongoDB
- DevOps: Docker, Terraform, AWS
"

echo -e "${GREEN}✓${NC} Commit criado"

# Fazer push
echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${YELLOW}[IMPORTANTE]${NC} Pronto para fazer push!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "O Git irá solicitar suas credenciais do GitHub."
echo ""
echo "OPÇÕES DE AUTENTICAÇÃO:"
echo ""
echo "1. TOKEN PESSOAL (Recomendado):"
echo "   - Acesse: https://github.com/settings/tokens"
echo "   - Clique em 'Generate new token (classic)'"
echo "   - Selecione 'repo' em scopes"
echo "   - Use o token como senha"
echo ""
echo "2. SSH (Alternativa):"
echo "   - Configure SSH keys: https://docs.github.com/pt/authentication"
echo "   - Altere remote: git remote set-url origin git@github.com:Elitj06/Gym-Sisten.git"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

read -p "Pressione ENTER para fazer o push agora ou Ctrl+C para cancelar..."

echo ""
echo -e "${BLUE}[INFO]${NC} Fazendo push para GitHub..."

# Fazer push
if git push -u origin main; then
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo -e "${GREEN}✓ SUCESSO!${NC}"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    echo "Seu projeto foi enviado com sucesso para:"
    echo -e "${BLUE}$REPO_URL${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Acesse: https://github.com/Elitj06/Gym-Sisten"
    echo "2. Verifique os arquivos enviados"
    echo "3. Configure GitHub Actions (opcional)"
    echo "4. Adicione colaboradores (se necessário)"
    echo "5. Configure proteção de branch (recomendado)"
    echo ""
    echo -e "${GREEN}Parabéns! Seu código está no GitHub! 🎉${NC}"
    echo ""
else
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo -e "${RED}✗ ERRO ao fazer push${NC}"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    echo "Possíveis soluções:"
    echo ""
    echo "1. Verifique suas credenciais do GitHub"
    echo "2. Certifique-se de ter acesso ao repositório"
    echo "3. Use um Personal Access Token ao invés de senha"
    echo "4. Tente configurar SSH ao invés de HTTPS"
    echo ""
    echo "Para mais ajuda:"
    echo "https://docs.github.com/pt/authentication"
    echo ""
    exit 1
fi
