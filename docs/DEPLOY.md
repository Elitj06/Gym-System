# Deploy Híbrido - Gym-System (Grátis / Low-Cost)

Este guia descreve o deploy da aplicação com **frontend na Vercel** e **backend + AI na Railway**, usando **bancos de dados em planos gratuitos**.

---

## Visão geral

| Componente        | Plataforma   | Custo        | URL exemplo                    |
|------------------|-------------|-------------|---------------------------------|
| Web Dashboard    | **Vercel**  | Grátis      | https://gym-system.vercel.app   |
| Backend API      | **Railway** | ~$5/mês free tier | https://gym-backend.up.railway.app |
| AI Vision        | **Railway** | (mesmo projeto)   | https://gym-ai.up.railway.app   |
| PostgreSQL       | **Supabase**| 500 MB grátis    | (connection string)            |
| MongoDB          | **MongoDB Atlas** | 512 MB grátis | (connection string)        |
| Redis            | **Redis Cloud**   | 30 MB grátis  | (connection string)        |

---

## FASE 1: Bancos de dados (gratuitos)

Crie as contas e anote as connection strings para usar no backend (Railway).

### 1.1 PostgreSQL – Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta.
2. **New Project** → nome (ex: `gym-system`) → senha do DB → **Create**.
3. Em **Project Settings** → **Database** copie a **Connection string (URI)**.
   - Formato: `postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
4. Use como `DATABASE_URL` no backend.

### 1.2 MongoDB – Atlas

1. Acesse [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) e crie conta.
2. **Build a Database** → M0 FREE → região próxima → **Create**.
3. Crie um utilizador (user/password) e permita acesso de qualquer IP (`0.0.0.0/0`) em Network Access.
4. **Connect** → **Drivers** → copie a connection string.
   - Formato: `mongodb+srv://user:password@cluster.mongodb.net/gym_analytics`
5. Use como `MONGO_URL` no backend.

### 1.3 Redis – Redis Cloud

1. Acesse [redis.com/try-free](https://redis.com/try-free/) e crie conta.
2. **New subscription** → Free (30 MB) → **Create subscription**.
3. **New database** → nome (ex: `gym-cache`) → **Activate**.
4. Em **Configuration** copie **Public endpoint** e, se pedido, a senha.
   - Formato: `redis://default:password@host:port`
5. Use como `REDIS_URL` no backend.

---

## FASE 2: Backend no Railway

1. Acesse [railway.app](https://railway.app) e faça login com **GitHub**.
2. **New Project** → **Deploy from GitHub repo**.
3. Escolha o repositório **Gym-System** (Elitj06/Gym-System).
4. **Settings** do serviço:
   - **Root Directory:** `backend`
   - **Build Command:** (deixe em branco ou `npm run build`)
   - **Start Command:** `npm run build && npm start` (ou use o que está em `backend/railway.json`)
5. **Variables** – adicione as variáveis de ambiente:

   | Nome           | Valor (exemplo)                          |
   |----------------|------------------------------------------|
   | `PORT`         | `3000` (Railway pode sobrescrever)        |
   | `NODE_ENV`     | `production`                             |
   | `DATABASE_URL` | (connection string do Supabase)          |
   | `REDIS_URL`    | (connection string do Redis Cloud)       |
   | `MONGO_URL`    | (connection string do MongoDB Atlas)    |
   | `JWT_SECRET`   | (string aleatória longa e segura)        |
   | `CORS_ORIGIN`  | `https://gym-system.vercel.app`          |

6. **Deploy** – Railway faz o build e o deploy. Anote a URL pública (ex: `https://gym-backend.up.railway.app`).
7. Em **Settings** → **Networking** → **Generate Domain** se ainda não tiver domínio.

---

## FASE 3: AI Vision no Railway (opcional, segundo serviço)

1. No mesmo projeto Railway: **New** → **GitHub Repo** → de novo **Gym-System**.
2. **Settings** do novo serviço:
   - **Root Directory:** `ai-vision`
   - Railway deve detetar Python e usar o **Procfile** (gunicorn).
3. **Variables** – ex.: `PORT` (definido pela Railway), `FLASK_ENV=production`, `CONFIDENCE_THRESHOLD=0.7`.
4. **Generate Domain** e anote a URL (ex: `https://gym-ai.up.railway.app`).

Se o deploy do AI Vision falhar (ex.: por tamanho do TensorFlow), pode ficar só o backend na Railway e o AI Vision para depois ou para outra plataforma.

---

## FASE 4: Frontend na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com **GitHub**.
2. **Add New** → **Project** → importe o repositório **Gym-System**.
3. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `web-dashboard`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** (opcional, para o dashboard chamar o backend):
   - `VITE_API_URL` = `https://gym-backend.up.railway.app` (URL do backend no Railway)
5. **Deploy** – a Vercel faz o build e publica. A URL ficará tipo `https://gym-system.vercel.app` (ou o nome que der ao projeto).

---

## Resumo de variáveis

### Backend (Railway)

- `PORT` – definido pela Railway
- `NODE_ENV=production`
- `DATABASE_URL` – Supabase (PostgreSQL)
- `REDIS_URL` – Redis Cloud
- `MONGO_URL` – MongoDB Atlas
- `JWT_SECRET` – segredo forte
- `CORS_ORIGIN` – URL do frontend na Vercel (ex: `https://gym-system.vercel.app`)

### Frontend (Vercel)

- `VITE_API_URL` – URL do backend na Railway (ex: `https://gym-backend.up.railway.app`)

---

## Após o deploy

- **Frontend:** abra a URL da Vercel; o login e as chamadas à API usarão o backend na Railway se `VITE_API_URL` estiver definido.
- **Backend:** teste `https://sua-url.up.railway.app/health` (ou o endpoint de health que tiver).
- **CORS:** se der erro de CORS no browser, confirme que `CORS_ORIGIN` no backend inclui exatamente a URL do frontend na Vercel (sem barra no final).

Se quiser, na próxima iteração podemos adicionar um endpoint `/health` no backend (se ainda não existir) e ajustar o frontend para usar `apiUrl()` em todas as chamadas à API.
