# 🗄️ Configuração do Banco de Dados - Supabase

## ✅ Banco de Dados Já Configurado

O projeto está usando **Supabase PostgreSQL** que já estava configurado anteriormente.

### 📊 Connection String

```
postgresql://postgres:*Glockblss213@db.uefeequpwjpkeorkmwbe.supabase.co:5432/postgres
```

## 🚀 Configurar no Vercel

### Passo 1: Abrir Environment Variables
https://vercel.com/eliandro-tjader/gym-system/settings/environment-variables

### Passo 2: Adicionar DATABASE_URL

**Se já existir DATABASE_URL:**
1. Clique nos **3 pontinhos** (...) ao lado
2. Clique em **"Edit"**
3. Cole o valor:
```
postgresql://postgres:*Glockblss213@db.uefeequpwjpkeorkmwbe.supabase.co:5432/postgres
```
4. Certifique-se que está marcado: ✅ Production ✅ Preview ✅ Development
5. Clique em **"Save"**

**Se NÃO existir:**
1. Clique em **"Add New"**
2. Key: `DATABASE_URL`
3. Value: `postgresql://postgres:*Glockblss213@db.uefeequpwjpkeorkmwbe.supabase.co:5432/postgres`
4. Environments: Marque ✅ Production ✅ Preview ✅ Development
5. Clique em **"Save"**

### Passo 3: Remover Variáveis Antigas (se existir)

Procure e delete qualquer variável relacionada ao Neon:
- Qualquer `DATABASE_URL` com `.neon.tech`
- `POSTGRES_URL_NON_POOLING`
- Outras variáveis de banco antigo

### Passo 4: Redeploy

O Vercel vai fazer redeploy automaticamente após salvar a variável.

Ou você pode forçar:
```bash
git commit --allow-empty -m "trigger: redeploy com Supabase"
git push origin main
```

## 🌱 Popular o Banco de Dados

Depois que o deployment estiver **READY** (não Error), execute:

### Via Browser/Postman/Insomnia:
- **URL**: `https://gym-system-eliandro-tjader.vercel.app/api/seed`
- **Method**: `POST`
- **Body (JSON)**: 
```json
{"password":"GymSystem2026!"}
```

### Via Terminal/CMD:
```bash
curl -X POST https://gym-system-eliandro-tjader.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"password":"GymSystem2026!"}'
```

### Via PowerShell (Windows):
```powershell
Invoke-WebRequest -Uri "https://gym-system-eliandro-tjader.vercel.app/api/seed" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"password":"GymSystem2026!"}'
```

## ✅ Verificar Se Funcionou

### 1. Testar Conexão
```bash
curl https://gym-system-eliandro-tjader.vercel.app/api/seed
```

Deve retornar algo como:
```json
{
  "status": "Database connection OK",
  "data": {
    "plans": 0,
    "members": 0,
    "employees": 0,
    "seeded": false
  }
}
```

### 2. Popular o Banco (se seeded: false)
Execute o comando POST acima com a senha.

### 3. Verificar Dashboard
```bash
curl https://gym-system-eliandro-tjader.vercel.app/api/dashboard
```

### 4. Ver Membros
```bash
curl https://gym-system-eliandro-tjader.vercel.app/api/members
```

### 5. Ver Planos
```bash
curl https://gym-system-eliandro-tjader.vercel.app/api/plans
```

## 📊 O Que Será Criado

Após executar o seed:
- ✅ 4 planos (Mensal, Trimestral, Semestral, Anual)
- ✅ 2 funcionários (Admin e Instrutor)
- ✅ 10 membros de exemplo
- ✅ 5 pagamentos de exemplo

## 🔧 Desenvolvimento Local

Para trabalhar localmente:

1. Clone o repositório
2. Crie arquivo `.env` na raiz:
```env
DATABASE_URL="postgresql://postgres:*Glockblss213@db.uefeequpwjpkeorkmwbe.supabase.co:5432/postgres"
```

3. Instale dependências:
```bash
npm install
```

4. Execute migrations:
```bash
npm run db:push
```

5. Popular banco (opcional):
```bash
npm run db:seed
```

6. Rodar servidor:
```bash
npm run dev
```

## 🎯 Acessar Supabase Dashboard

Para gerenciar o banco visualmente:

1. Acesse: https://supabase.com/dashboard
2. Entre com sua conta
3. Selecione o projeto: `uefeequpwjpkeorkmwbe`
4. Vá em **Table Editor** para ver as tabelas
5. Vá em **SQL Editor** para executar queries

## ⚠️ IMPORTANTE

- Nunca commite o arquivo `.env` com senhas reais
- Use variáveis de ambiente diferentes para dev/prod
- A senha está visível aqui apenas porque é um ambiente de desenvolvimento

## 🆘 Troubleshooting

### Erro: "Can't reach database server"
- Verifique se a connection string está correta
- Verifique se não tem espaços extras
- Teste a conexão no Supabase Dashboard

### Erro: "P1001: Can't reach database"
- Aguarde 1-2 minutos após salvar a variável
- Verifique se marcou todos os environments (Production, Preview, Development)
- Tente fazer redeploy manual

### Build continua falhando
- Vá em Vercel → Settings → Environment Variables
- Delete TODAS as variáveis de banco antigas
- Adicione apenas a DATABASE_URL do Supabase
- Faça redeploy
