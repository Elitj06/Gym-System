# Arquitetura do Sistema

## Visão Geral

O Gym AI System é uma aplicação distribuída de microserviços para gestão inteligente de academias com detecção de poses em tempo real usando IA.

## Componentes Principais

### 1. Backend API (Node.js + TypeScript)
**Responsabilidades:**
- API RESTful para todas as operações
- Autenticação e autorização (JWT)
- WebSocket para comunicação em tempo real
- Orquestração de serviços
- Cache com Redis
- Armazenamento de dados relacionais (PostgreSQL)

**Stack:**
- Node.js 18+
- Express.js
- TypeScript
- Socket.io
- Sequelize ORM
- Redis
- JWT

**Porta:** 3000

### 2. AI Vision Service (Python)
**Responsabilidades:**
- Detecção de poses com MediaPipe
- Análise de exercícios
- Geração de alertas inteligentes
- Processamento de vídeo
- Machine Learning para classificação

**Stack:**
- Python 3.9+
- Flask
- TensorFlow
- MediaPipe
- OpenCV
- NumPy

**Porta:** 5000

### 3. Web Dashboard (React)
**Responsabilidades:**
- Interface administrativa
- Visualização de analytics
- Mapas de calor
- Gestão de usuários e academias
- Configurações do sistema

**Stack:**
- React 18
- TypeScript
- Tailwind CSS
- Recharts
- Vite

**Porta:** 3001

### 4. Mobile App (React Native)
**Responsabilidades:**
- App para membros e instrutores
- Visualização de treinos
- Notificações push
- Câmera para detecção ao vivo

**Stack:**
- React Native
- TypeScript
- Expo
- React Navigation

## Bancos de Dados

### PostgreSQL
**Uso:** Dados relacionais principais
- Usuários
- Academias
- Equipamentos
- Câmeras
- Sessões

**Porta:** 5432

### MongoDB
**Uso:** Analytics e dados não-estruturados
- Detecções de pose
- Histórico de exercícios
- Métricas de performance
- Logs de eventos

**Porta:** 27017

### Redis
**Uso:** Cache e sessões
- Cache de API
- Sessões de usuário
- Rate limiting
- Pub/Sub para real-time

**Porta:** 6379

## Fluxo de Dados

```
┌─────────────┐
│   Cliente   │
│ (Web/Mobile)│
└──────┬──────┘
       │
       ▼
┌──────────────┐
│    Nginx     │ (Load Balancer / Reverse Proxy)
│   Port 80    │
└──────┬───────┘
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Backend    │   │ Web Dashboard│   │ AI Vision   │
│  Port 3000  │   │  Port 3001   │   │  Port 5000  │
└──────┬──────┘   └──────────────┘   └──────┬──────┘
       │                                     │
       ├─────────────┬───────────────────────┤
       ▼             ▼                       ▼
┌────────────┐ ┌───────────┐        ┌──────────────┐
│ PostgreSQL │ │   Redis   │        │   MongoDB    │
│  Port 5432 │ │ Port 6379 │        │  Port 27017  │
└────────────┘ └───────────┘        └──────────────┘
```

## Fluxo de Detecção de Pose

1. **Cliente** envia imagem/vídeo → **Backend API**
2. **Backend** encaminha para → **AI Vision Service**
3. **AI Vision** processa com MediaPipe
4. **AI Vision** retorna landmarks e análise
5. **Backend** salva no MongoDB
6. **Backend** emite evento WebSocket para clientes conectados
7. **Sistema de Alertas** verifica condições
8. **Notificações** enviadas se necessário

## Segurança

### Autenticação
- JWT tokens com expiração
- Refresh tokens
- Password hashing com bcrypt (10 rounds)

### Autorização
- Role-based access control (RBAC)
- Roles: admin, manager, instructor, member

### API Security
- Helmet.js para headers seguros
- CORS configurado
- Rate limiting
- Input validation
- SQL injection prevention (ORM)
- XSS protection

### Network Security
- HTTPS/TLS em produção
- Certificados SSL
- Firewall rules
- VPC isolada (AWS)

## Escalabilidade

### Horizontal Scaling
- Backend: Load balancer + múltiplas instâncias
- AI Vision: Task queue com workers
- Database: Read replicas

### Vertical Scaling
- Ajustar recursos de containers
- Otimização de queries
- Caching agressivo

### Performance
- Redis para cache
- Database indexing
- CDN para assets estáticos
- Lazy loading
- Pagination

## Monitoramento

### Métricas
- Prometheus para coleta de métricas
- Grafana para visualização
- Alertas automáticos

### Logging
- Winston para logs estruturados
- CloudWatch Logs (AWS)
- Log aggregation

### Health Checks
- Endpoint /health em todos os serviços
- Docker healthchecks
- Kubernetes liveness/readiness probes

## Deploy

### Development
```bash
docker-compose up
```

### Production (AWS)
```bash
cd infrastructure/terraform
terraform apply
```

### CI/CD
- GitHub Actions
- Automated tests
- Docker build & push
- Rolling updates

## Tecnologias Utilizadas

**Backend:**
- Node.js, TypeScript, Express, Socket.io
- PostgreSQL, Redis, MongoDB, Sequelize

**AI/ML:**
- Python, TensorFlow, MediaPipe, OpenCV

**Frontend:**
- React, TypeScript, Tailwind CSS

**Mobile:**
- React Native, Expo

**DevOps:**
- Docker, Docker Compose, Terraform
- AWS (EC2, RDS, S3, CloudWatch)
- Nginx, Prometheus, Grafana

## Estrutura de Diretórios

```
gym-ai-system/
├── backend/              # API Backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── websocket/
│   ├── Dockerfile
│   └── package.json
│
├── ai-vision/           # AI Vision Service
│   ├── src/
│   │   ├── services/
│   │   └── utils/
│   ├── Dockerfile
│   └── requirements.txt
│
├── web-dashboard/       # React Dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
│
├── mobile-app/          # React Native App
│   └── src/
│
├── infrastructure/      # Terraform, Docker, Nginx
│   ├── terraform/
│   ├── nginx/
│   └── prometheus/
│
├── database/           # SQL scripts
│   └── init.sql
│
├── docs/               # Documentação
│
└── docker-compose.yml
```

## Contribuindo

Veja `CONTRIBUTING.md` para guidelines de contribuição.

## Licença

MIT - Veja `LICENSE` para detalhes.
