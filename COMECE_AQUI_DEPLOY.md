# Comece aqui – Deploy do Gym-System (passo a passo)

Você não precisa ser programador. Siga os passos na ordem. Em cada um, faça só o que está escrito e depois passe ao seguinte.

---

## O que já está pronto (feito por mim)

- Código do projeto preparado para Vercel e Railway
- Backend e frontend configurados
- Guia técnico em `docs/DEPLOY.md` (para referência)

**O que você vai fazer:** criar contas grátis, colar alguns textos nas plataformas e clicar em Deploy.

---

## PASSO 1 – Supabase (banco PostgreSQL)

1. Abra no navegador: **https://supabase.com**
2. Clique em **Start your project** (ou “Sign In”).
3. Crie conta com **GitHub** (é mais rápido) ou e-mail.
4. Depois de entrar, clique em **New Project**.
5. Preencha:
   - **Name:** `gym-system` (ou outro nome que quiser)
   - **Database Password:** invente uma senha forte e **guarde num bloco de notas** (ex.: `MinhaSenhaSegura123!`)
   - **Region:** escolha a mais próxima (ex.: South America)
6. Clique em **Create new project** e espere 1–2 minutos.
7. No menu à esquerda, vá em **Project Settings** (ícone de engrenagem).
8. Clique em **Database**.
9. Na secção **Connection string**, escolha **URI**.
10. Copie a linha que começa com `postgresql://...` (botão **Copy**).
11. **Guarde essa linha** no bloco de notas com o nome “Supabase – DATABASE_URL”.  
    (Se tiver `[YOUR-PASSWORD]` na linha, troque por a senha que criou no passo 5.)

**Quando terminar:** anote “PASSO 1 feito” e passe ao Passo 2.

---

## PASSO 2 – MongoDB Atlas (banco MongoDB)

1. Abra: **https://www.mongodb.com/cloud/atlas**
2. Clique em **Try Free** ou **Sign In** e crie conta (pode usar Google/GitHub).
3. Responda ao questionário como quiser (ex.: “Building an application”) e continue.
4. Escolha o plano **M0 FREE** e clique em **Create**.
5. **Create Deployment:** deixe **M0 Sandbox** e a região próxima; clique **Create**.
6. Crie um utilizador:
   - **Username:** `gymuser` (ou outro)
   - **Password:** invente uma senha e **guarde**.
   - Clique **Create User**.
7. Em “Where would you like to connect from?” clique **My Local Environment** e depois **Add My Current IP Address**.  
   Para aceitar de qualquer sítio (mais simples para começar), clique em **Allow Access from Anywhere** (IP `0.0.0.0/0`) e confirme.
8. Clique **Finish and Close**.
9. No ecrã do cluster, clique em **Connect**.
10. Escolha **Drivers** (ou “Connect your application”).
11. Copie a **connection string** (algo como `mongodb+srv://gymuser:...@cluster0.xxxxx.mongodb.net/`).
12. Troque `<password>` pela senha do utilizador que criou (passo 6).  
    **Guarde essa linha** no bloco de notas como “MongoDB – MONGO_URL”.

**Quando terminar:** anote “PASSO 2 feito” e passe ao Passo 3.

---

## PASSO 3 – Redis Cloud (cache Redis)

1. Abra: **https://redis.com/try-free/**
2. Crie conta (e-mail ou “Continue with Google”).
3. **Create your free subscription** (plano free, 30 MB).
4. **Create database:**  
   - Name: `gym-cache`  
   - Clique **Create database** e espere ficar “Active”.
5. Clique no nome da base para abrir.
6. Em **General** ou **Configuration** procure **Public endpoint** ou **Connection**.
7. Copie o URL (ex.: `redis://default:xxxx@redis-xxxx.cloud.redislabs.com:12345`).  
   **Guarde** no bloco de notas como “Redis – REDIS_URL”.

**Quando terminar:** anote “PASSO 3 feito” e passe ao Passo 4.

---

## PASSO 4 – Railway (Backend)

1. Abra: **https://railway.app**
2. Clique **Login** e entre com **GitHub** (autorize se pedir).
3. Clique **New Project**.
4. Escolha **Deploy from GitHub repo**.
5. Se pedir, autorize o Railway a ver os seus repositórios.  
   Selecione o repositório **Gym-System** (ou **Elitj06/Gym-System**) e clique **Deploy** (ou “Add repo” e depois “Deploy”).
6. Quando o serviço aparecer no projeto, clique nele (o retângulo do deploy).
7. Abra o separador **Settings** (ou “Config”).
8. Procure **Root Directory** (ou “Source” / “Build”).  
   Escreva exatamente: `backend`  
   (só esta palavra, minúsculas). Guarde/Apply.
9. Abra o separador **Variables** (ou “Environment”).
10. Adicione estas variáveis uma a uma (nome exatamente assim, valor conforme indicado):

    | Nome          | Valor que você cola |
    |---------------|----------------------|
    | `NODE_ENV`    | `production`         |
    | `DATABASE_URL`| (a linha que guardou do Supabase – Passo 1) |
    | `REDIS_URL`   | (a linha que guardou do Redis – Passo 3) |
    | `MONGO_URL`   | (a linha que guardou do MongoDB – Passo 2) |
    | `JWT_SECRET`  | (invente uma frase longa, ex.: `minhaChaveSecretaGym2024Segura`) |
    | `CORS_ORIGIN` | `https://gym-system.vercel.app` (ou a URL que a Vercel der no Passo 5; pode ajustar depois) |

11. Guarde as variáveis (Save / Apply).
12. Em **Settings**, procure **Networking** ou **Public Networking** e clique **Generate Domain** (ou “Add domain”).  
    Vai aparecer um link tipo `https://gym-system-backend-production.up.railway.app`.  
    **Copie e guarde** esse link – é a URL do seu backend.

**Quando terminar:** anote “PASSO 4 feito” e a URL do backend. Depois passe ao Passo 5.

---

## PASSO 5 – Vercel (Frontend / site)

1. Abra: **https://vercel.com**
2. Clique **Sign Up** ou **Login** e entre com **GitHub**.
3. Clique **Add New…** → **Project**.
4. Na lista, escolha o repositório **Gym-System** e clique **Import** (ou “Deploy”).
5. Antes de fazer Deploy, em **Configure Project**:
   - **Root Directory:** clique **Edit**, escreva `web-dashboard` e confirme.
   - **Framework Preset:** deve aparecer **Vite** (se não, escolha Vite).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Em **Environment Variables** (Variáveis de ambiente), adicione:
   - **Name:** `VITE_API_URL`  
   - **Value:** a URL do backend que guardou no Passo 4 (ex.: `https://gym-system-backend-production.up.railway.app`)  
   - (Não coloque barra `/` no fim.)
7. Clique **Deploy** e espere 1–2 minutos.
8. Quando terminar, vai aparecer **Congratulations** e um link tipo `https://gym-system.vercel.app`.  
    **Esse é o link do seu site.** Abra e guarde nos favoritos.

**Opcional:** Se no Passo 4 você usou `https://gym-system.vercel.app` em `CORS_ORIGIN` e a Vercel deu outro domínio (ex.: `gym-system-xxx.vercel.app`), volte ao Railway → Variables e altere `CORS_ORIGIN` para esse domínio da Vercel (sem barra no fim).

---

## Resumo

- **Passo 1:** Supabase → guardar DATABASE_URL  
- **Passo 2:** MongoDB Atlas → guardar MONGO_URL  
- **Passo 3:** Redis Cloud → guardar REDIS_URL  
- **Passo 4:** Railway → root `backend`, colar as 3 URLs + JWT_SECRET + CORS_ORIGIN, gerar domínio e guardar a URL do backend  
- **Passo 5:** Vercel → root `web-dashboard`, variável VITE_API_URL = URL do backend, Deploy e guardar a URL do site  

Se travar num passo, diga em qual (1, 2, 3, 4 ou 5) e o que está a ver no ecrã, e eu guio o próximo clique.
