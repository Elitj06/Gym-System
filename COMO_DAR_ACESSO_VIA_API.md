# Como dar acesso por API para eu executar o deploy por você

Siga estes passos **uma vez**. No final você terá um ficheiro com os tokens/URLs. Pode colocar esse ficheiro no projeto e **dizer-me "já coloquei os tokens"** – aí eu executo o script de deploy por você (ou você mesmo executa o script).

**Importante:** O ficheiro com os tokens **não** será enviado para o GitHub (está no `.gitignore`). Use-o só no seu computador.

---

## O que você vai precisar

| Onde | O que obter | Usado para |
|------|-------------|------------|
| Supabase | 1 URL (connection string) | Banco PostgreSQL |
| MongoDB Atlas | 1 URL (connection string) | Banco MongoDB |
| Redis Cloud | 1 URL (connection string) | Cache Redis |
| Railway | 1 token (API Token) | Deploy do backend |
| Vercel | 1 token (Token de acesso) | Deploy do frontend |

---

## Passo A – Supabase (URL do banco)

1. Aceda a **https://supabase.com** e entre na sua conta.
2. Abra o seu projeto (ou crie um: **New Project** → nome `gym-system` → defina uma senha e guarde).
3. Menu lateral: **Project Settings** (engrenagem) → **Database**.
4. Em **Connection string** escolha **URI**.
5. Clique em **Copy** e guarde essa linha.  
   Se tiver `[YOUR-PASSWORD]`, substitua pela senha do projeto que definiu.  
   Exemplo (não use este): `postgresql://postgres.xxx:SUA_SENHA@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`

---

## Passo B – MongoDB Atlas (URL do banco)

1. Aceda a **https://cloud.mongodb.com** e entre.
2. Crie um cluster **M0 FREE** se ainda não tiver (**Create** → M0 → Create).
3. **Database Access** → **Add New Database User** → username/password → guarde a senha.
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.
5. **Database** → **Connect** → **Drivers** → copie a connection string (ex.: `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/`).
6. Troque `<password>` pela senha do utilizador. Guarde a linha completa.

---

## Passo C – Redis Cloud (URL do cache)

1. Aceda a **https://redis.com/try-free/** e crie conta / entre.
2. Crie uma **subscription** free e depois uma **database** (ex.: nome `gym-cache`).
3. Quando estiver **Active**, abra a base e copie o **Public endpoint** (URL completa, ex.: `redis://default:xxx@redis-xxxx.cloud.redislabs.com:12345`).
4. Guarde essa linha.

---

## Passo D – Railway (token da API)

1. Aceda a **https://railway.app** e entre com GitHub.
2. Clique no **seu avatar** (canto inferior esquerdo) → **Account Settings** (ou aceda a **https://railway.app/account**).
3. Vá a **Tokens** ou **API**.
4. **Create Token** (ou **New Token**) → dê um nome (ex.: `Deploy Gym-System`) → **Create**.
5. **Copie o token** assim que aparecer (só é mostrado uma vez) e guarde-o.

---

## Passo E – Vercel (token de acesso)

1. Aceda a **https://vercel.com** e entre com GitHub.
2. Clique no **seu avatar** (canto superior direito) → **Settings**.
3. No menu lateral: **Tokens** (em "Access" ou "Account").
4. **Create** → nome (ex.: `Deploy Gym-System`) → **Create Token**.
5. **Copie o token** e guarde-o.

---

## Criar o ficheiro para o script (e para eu executar)

No seu computador, na **pasta raiz do projeto Gym-System** (a mesma onde está o `README.md`), crie um ficheiro chamado **`.env.deploy`** com o seguinte conteúdo.  
Substitua os valores entre aspas pelos que você guardou (sem partilhar aqui as senhas reais).

```env
# Cole abaixo os valores que guardou. Não partilhe este ficheiro.

# Bancos (URLs completas)
DATABASE_URL="postgresql://postgres.xxx:SUA_SENHA@....supabase.com:6543/postgres"
MONGO_URL="mongodb+srv://user:senha@cluster0.xxxxx.mongodb.net/"
REDIS_URL="redis://default:senha@redis-xxxx.redislabs.com:12345"

# Tokens de API (cole o token completo)
RAILWAY_TOKEN="seu_token_railway_aqui"
VERCEL_TOKEN="seu_token_vercel_aqui"

# Opcional: segredo para o backend (invente uma frase longa)
JWT_SECRET="umaFraseLongaESeguraParaOGymSystem2024"

# Opcional: depois de fazer deploy do backend no Railway, coloque aqui a URL e execute o script de novo para a Vercel usar
# RAILWAY_BACKEND_URL="https://gym-system-backend.up.railway.app"
```

- **DATABASE_URL** = linha que copiou do Supabase (Passo A).  
- **MONGO_URL** = linha que copiou do MongoDB Atlas (Passo B).  
- **REDIS_URL** = linha que copiou do Redis Cloud (Passo C).  
- **RAILWAY_TOKEN** = token que criou no Railway (Passo D).  
- **VERCEL_TOKEN** = token que criou na Vercel (Passo E).  
- **JWT_SECRET** = pode ser exatamente a frase do exemplo ou outra que inventar.

Guarde o ficheiro (na pasta do projeto, com o nome exato `.env.deploy`).

---

## Próximo passo

Quando o ficheiro **`.env.deploy`** estiver preenchido e guardado na pasta do projeto:

- **Opção 1:** Diga-me **"já coloquei os tokens"** ou **"pode executar o deploy"**. Eu executo o script por você (o script lê o `.env.deploy` e usa a API da Vercel para criar o projeto e iniciar o deploy do site; o Railway continua a ser configurado por você no dashboard com as variáveis que o script mostra).
- **Opção 2:** Você mesmo pode executar no terminal, na pasta do projeto:
  ```bash
  node scripts/deploy-com-apis.mjs
  ```
  (O script cria/atualiza o projeto na Vercel e mostra exatamente o que colar nas variáveis do Railway.)

**Segurança:** Após o deploy, pode apagar o token da Vercel e o da Railway nas respetivas contas e criar novos quando precisar outra vez.
