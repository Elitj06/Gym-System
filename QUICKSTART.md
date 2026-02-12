# 🚀 Guia de Início Rápido

## Visão Geral do Projeto

Este é um **Sistema de Gestão Inteligente para Academias** completo com:
- ✅ Backend API (Node.js + TypeScript + WebSocket)
- ✅ AI Vision Service (Python + TensorFlow + MediaPipe)
- ✅ Mobile App (React Native)
- ✅ Web Dashboard (React + TypeScript)
- ✅ Infraestrutura completa (Docker, Terraform, AWS)

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js 18+** - https://nodejs.org/
- **Python 3.9+** - https://python.org/
- **Docker** - https://docker.com/
- **Docker Compose** - https://docs.docker.com/compose/
- **Git** - https://git-scm.com/

## ⚡ Início Rápido (5 minutos)

### Opção 1: Docker Compose (RECOMENDADO)

```bash
# 1. Clone o repositório (se ainda não fez)
git clone https://github.com/Elitj06/Gym-System.git
cd Gym-System

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 3. Inicie todos os serviços
docker-compose up -d

# 4. Aguarde os serviços iniciarem (30-60 segundos)
docker-compose logs -f

# 5. Acesse os serviços:
# - Backend API: http://localhost:3000
# - Web Dashboard: http://localhost:3001
# - AI Vision: http://localhost:5000
# - Grafana: http://localhost:3002 (admin/admin)
```

### Opção 2: Desenvolvimento Local

#### 1. Backend API

```bash
cd backend

# Instalar dependências
npm install

# Configurar banco de dados
# Certifique-se de que PostgreSQL, Redis e MongoDB estão rodando

# Executar migrações
npm run migrate

# Iniciar em modo desenvolvimento
npm run dev
```

#### 2. AI Vision Service

```bash
cd ai-vision

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Iniciar serviço
python src/main.py
```

#### 3. Web Dashboard

```bash
cd web-dashboard

# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

#### 4. Mobile App

```bash
cd mobile-app

# Instalar dependências
npm install

# iOS (requer macOS)
npm run ios

# Android (requer Android Studio)
npm run android
```

## 🔧 Configuração Básica

### Variáveis de Ambiente Essenciais

Edite o arquivo `.env` com suas configurações:

```env
# Banco de Dados
DATABASE_URL=postgresql://gym_user:gym_password@localhost:5432/gym_db
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017/gym_analytics

# API
PORT=3000
JWT_SECRET=seu_secret_super_seguro_aqui

# AI Vision
AI_VISION_URL=http://localhost:5000
CONFIDENCE_THRESHOLD=0.7
```

## 🧪 Testando o Sistema

### 1. Teste de Health Check

```bash
# Backend
curl http://localhost:3000/health

# AI Vision
curl http://localhost:5000/health
```

### 2. Teste de Autenticação

```bash
# Registrar usuário
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "Senha123!",
    "firstName": "Teste",
    "lastName": "Usuario"
  }'
```

### 3. Teste de Detecção de Pose

```bash
# Envie uma imagem (base64) para detectar pose
curl -X POST http://localhost:5000/api/v1/detect-pose \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,...",
    "userId": "user-id",
    "gymId": "gym-id"
  }'
```

## 📊 Acessando os Dashboards

### Web Dashboard
- URL: http://localhost:3001
- Login: Use as credenciais criadas no registro

### Grafana (Monitoramento)
- URL: http://localhost:3002
- Login: admin / admin
- Dashboards pré-configurados para métricas do sistema

## 🐛 Troubleshooting

### Problema: Portas já em uso

```bash
# Verificar portas em uso
sudo lsof -i :3000
sudo lsof -i :5000

# Ou altere as portas no .env
```

### Problema: Erros de conexão com banco de dados

```bash
# Verificar se os containers estão rodando
docker-compose ps

# Reiniciar containers
docker-compose restart postgres redis mongodb
```

### Problema: AI Vision não detecta poses

- Verifique se o modelo MediaPipe foi baixado corretamente
- Certifique-se de que a imagem está em formato válido (JPEG/PNG)
- Verifique os logs: `docker-compose logs ai-vision`

## 📝 Próximos Passos

1. **Explore a API**: Veja `docs/API.md` para documentação completa
2. **Customize o Dashboard**: Edite componentes em `web-dashboard/src`
3. **Configure Alertas**: Ajuste thresholds em `.env`
4. **Deploy em Produção**: Veja `docs/DEPLOYMENT.md`

## 🔗 Links Úteis

- [Documentação Completa](README.md)
- [Guia de API](docs/API.md)
- [Guia de Deploy](docs/DEPLOYMENT.md)
- [GitHub Issues](https://github.com/Elitj06/Gym-System/issues)

## 💡 Dicas

- Use `docker-compose logs -f [service]` para ver logs de um serviço específico
- Execute `docker-compose down -v` para limpar volumes e reiniciar do zero
- Configure webhooks para integração com Slack/Discord para alertas

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs: `docker-compose logs`
2. Consulte a documentação em `docs/`
3. Abra uma issue no GitHub
4. Email: elitjader@gmail.com

---

**Desenvolvido com ❤️ para revolucionar a gestão de academias**
