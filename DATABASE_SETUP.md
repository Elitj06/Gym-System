# 🗄️ Fase 2: Configuração do Banco de Dados

## Banco de Dados Implementado

Utilizamos **Prisma ORM** com **PostgreSQL** (compatível com Neon, Supabase, Railway, etc.)

### 📊 Modelos Criados

1. **Plan** - Planos de mensalidade
2. **Member** - Membros da academia
3. **Employee** - Funcionários
4. **Payment** - Pagamentos
5. **AccessLog** - Logs de entrada/saída
6. **Schedule** - Horários de aulas

## 🚀 Setup Local (Desenvolvimento)

### 1. Instalar PostgreSQL Localmente

#### macOS (Homebrew):
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Windows:
Baixe e instale do site oficial: https://www.postgresql.org/download/windows/

### 2. Criar Banco de Dados

```bash
# Acessar PostgreSQL
psql postgres

# Dentro do psql, executar:
CREATE DATABASE gym_system;
CREATE USER gym_user WITH PASSWORD 'gym_password';
GRANT ALL PRIVILEGES ON DATABASE gym_system TO gym_user;
\q
```

### 3. Configurar .env

Crie/edite o arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://gym_user:gym_password@localhost:5432/gym_system"
```

### 4. Executar Migrations

```bash
# Gerar Prisma Client
npm run db:generate

# Push do schema para o banco
npm run db:push

# Seed com dados iniciais
npm run db:seed
```

### 5. Verificar no Prisma Studio

```bash
npm run db:studio
```

Abrirá em `http://localhost:5555` com interface visual do banco.

## ☁️ Setup Produção (Vercel + Neon)

### 1. Criar Banco no Neon

1. Acesse: https://neon.tech
2. Faça login/cadastro
3. Crie um novo projeto: "gym-system"
4. Copie a connection string

### 2. Configurar no Vercel

1. Acesse seu projeto: https://vercel.com/eliandro-tjader/gym-system
2. Vá em **Settings** → **Environment Variables**
3. Adicione:
   ```
   Nome: DATABASE_URL
   Valor: postgresql://[seu-usuario]:[sua-senha]@[host].neon.tech/gym_system?sslmode=require
   ```
4. Marque: **Production**, **Preview**, **Development**
5. Clique em **Save**

### 3. Deploy com Banco

Após configurar a variável de ambiente:

```bash
git add .
git commit -m "feat: adicionar integração com banco de dados"
git push origin main
```

O Vercel irá:
1. Detectar o push
2. Instalar dependências (incluindo Prisma)
3. Executar `prisma generate`
4. Fazer build
5. Deploy

### 4. Popular Banco em Produção

Você pode executar o seed em produção de duas formas:

**Opção A: Via Vercel CLI**
```bash
vercel env pull .env.production
npm run db:seed
```

**Opção B: Criar endpoint de seed (temporário)**
Criar `/api/seed/route.ts` protegido com senha para executar uma única vez.

## 📡 API Endpoints Disponíveis

### Members (Membros)
- `GET /api/members` - Listar membros
- `GET /api/members?status=active` - Filtrar por status
- `GET /api/members?search=joão` - Buscar por nome/email/CPF
- `POST /api/members` - Criar membro
- `GET /api/members/[id]` - Obter membro específico
- `PATCH /api/members/[id]` - Atualizar membro
- `DELETE /api/members/[id]` - Deletar membro

### Plans (Planos)
- `GET /api/plans` - Listar planos
- `POST /api/plans` - Criar plano

### Dashboard
- `GET /api/dashboard` - Estatísticas e KPIs

## 🧪 Testar APIs

### Usando curl:

```bash
# Listar membros
curl http://localhost:3000/api/members

# Criar membro
curl -X POST http://localhost:3000/api/members \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Silva",
    "email": "teste@email.com",
    "cpf": "12312312312",
    "phone": "(11) 99999-9999",
    "birthDate": "1990-01-01",
    "gender": "M",
    "planId": "plan-mensal",
    "paymentDay": 5
  }'

# Dashboard
curl http://localhost:3000/api/dashboard
```

## 🔄 Próximas Etapas (Fase 3)

- [ ] Sistema de autenticação (NextAuth.js)
- [ ] Proteção de rotas
- [ ] Gestão de sessões
- [ ] Roles e permissões

## 📝 Notas Importantes

1. **Nunca** commite o arquivo `.env` com credenciais reais
2. O `.env` deve estar no `.gitignore`
3. Use variáveis de ambiente diferentes para dev/prod
4. Faça backup regular do banco de produção
5. Monitore os logs do Prisma em produção

## 🆘 Troubleshooting

### Erro: "Can't reach database server"
- Verifique se o PostgreSQL está rodando: `brew services list` (macOS) ou `sudo systemctl status postgresql` (Linux)
- Teste a connection string: `psql "postgresql://gym_user:gym_password@localhost:5432/gym_system"`

### Erro: "prisma generate" falha
- Limpe e reinstale: `rm -rf node_modules && npm install`
- Execute: `npx prisma generate`

### Erro de permissões no PostgreSQL
```sql
-- Conectar como superuser e executar:
GRANT ALL PRIVILEGES ON DATABASE gym_system TO gym_user;
GRANT ALL ON SCHEMA public TO gym_user;
```
