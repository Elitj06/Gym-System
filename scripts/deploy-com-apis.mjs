#!/usr/bin/env node
/**
 * Script de deploy via APIs – Vercel (e instruções para Railway).
 * Uso: node scripts/deploy-com-apis.mjs
 * Requer: .env.deploy na raiz do projeto com VERCEL_TOKEN, RAILWAY_TOKEN, DATABASE_URL, MONGO_URL, REDIS_URL, JWT_SECRET.
 * Opcional: RAILWAY_BACKEND_URL – se já tiver o backend no Railway, coloque aqui para a Vercel usar.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function loadEnvDeploy() {
  const path = join(rootDir, '.env.deploy');
  if (!existsSync(path)) {
    console.error('Ficheiro .env.deploy não encontrado na raiz do projeto.');
    console.error('Siga o guia COMO_DAR_ACESSO_VIA_API.md e crie o ficheiro com os tokens.');
    process.exit(1);
  }
  const content = readFileSync(path, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*["']?([^"'\n]*)["']?\s*$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnvDeploy();
const VERCEL_TOKEN = env.VERCEL_TOKEN;
const RAILWAY_BACKEND_URL = env.RAILWAY_BACKEND_URL || '';
const DATABASE_URL = env.DATABASE_URL;
const MONGO_URL = env.MONGO_URL;
const REDIS_URL = env.REDIS_URL;
const JWT_SECRET = env.JWT_SECRET || 'gym-system-jwt-secret-change-me';

if (!VERCEL_TOKEN) {
  console.error('Falta VERCEL_TOKEN no .env.deploy');
  process.exit(1);
}

const VERCEL_API = 'https://api.vercel.com';
const PROJECT_NAME = 'gym-system';
const GITHUB_REPO = 'Elitj06/Gym-System';

async function vercelRequest(method, path, body = null) {
  const url = path.startsWith('http') ? path : `${VERCEL_API}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {}
  if (!res.ok) {
    throw new Error(`Vercel ${res.status}: ${data?.error?.message || text}`);
  }
  return data;
}

async function main() {
  console.log('=== Deploy via APIs (Gym-System) ===\n');

  // 1. Listar projetos Vercel
  let projectId;
  try {
    const list = await vercelRequest('GET', '/v11/projects');
    const existing = list.projects?.find((p) => p.name === PROJECT_NAME);
    if (existing) {
      projectId = existing.id;
      console.log('Projeto Vercel "' + PROJECT_NAME + '" já existe. A atualizar configuração...');
    }
  } catch (e) {
    console.log('A listar projetos Vercel...', e.message);
  }

  const projectPayload = {
    name: PROJECT_NAME,
    framework: 'vite',
    rootDirectory: 'web-dashboard',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    gitRepository: {
      type: 'github',
      repo: GITHUB_REPO,
    },
    environmentVariables: [
      { key: 'VITE_API_URL', value: RAILWAY_BACKEND_URL || 'https://gym-system-backend.up.railway.app', type: 'plain' },
    ],
  };

  if (!projectId) {
    try {
      const created = await vercelRequest('POST', '/v11/projects', projectPayload);
      projectId = created.id;
      console.log('Projeto Vercel "' + PROJECT_NAME + '" criado.');
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        const list = await vercelRequest('GET', '/v11/projects');
        const p = list.projects?.find((x) => x.name === PROJECT_NAME);
        if (p) projectId = p.id;
      }
      if (!projectId) {
        console.error('Erro ao criar projeto na Vercel:', e.message);
        console.log('\nPode criar manualmente: https://vercel.com/new → Import Gym-System → Root Directory: web-dashboard');
        process.exit(1);
      }
    }
  }

  // 2. Trigger deployment (project must be linked to GitHub in Vercel first)
  try {
    const deployment = await vercelRequest('POST', '/v13/deployments', {
      name: PROJECT_NAME,
      project: projectId,
      target: 'production',
      gitSource: {
        type: 'github',
        ref: 'main',
        repo: GITHUB_REPO,
        org: 'Elitj06',
      },
    });
    const dUrl = deployment.url || deployment.alias?.[0];
    console.log('\nDeploy na Vercel iniciado.');
    console.log('Quando terminar, o site ficará em: https://' + (dUrl || PROJECT_NAME + '.vercel.app'));
  } catch (e) {
    console.log('Nota: se o deploy automático falhar, faça o primeiro deploy em https://vercel.com/new (Import Gym-System, Root: web-dashboard). Depois os próximos deploys serão automáticos ao fazer push no GitHub.');
    console.log('Erro:', e.message);
  }

  // 3. Instruções Railway
  console.log('\n--- Railway (Backend) ---');
  console.log('O backend deve ser configurado no Railway com as variáveis do .env.deploy.');
  console.log('1. Aceda a https://railway.app/new → Deploy from GitHub repo → Elitj06/Gym-System');
  console.log('2. No serviço: Settings → Root Directory = backend');
  console.log('3. Variables → adicione (copie os valores do .env.deploy):');
  console.log('   NODE_ENV=production');
  console.log('   DATABASE_URL=' + (DATABASE_URL ? '(o seu valor)' : ''));
  console.log('   REDIS_URL=' + (REDIS_URL ? '(o seu valor)' : ''));
  console.log('   MONGO_URL=' + (MONGO_URL ? '(o seu valor)' : ''));
  console.log('   JWT_SECRET=' + (JWT_SECRET ? '(o seu valor)' : ''));
  console.log('   CORS_ORIGIN=https://' + PROJECT_NAME + '.vercel.app');
  console.log('4. Settings → Networking → Generate Domain');
  console.log('5. Copie a URL do backend e, na Vercel, adicione em Environment Variables: VITE_API_URL = essa URL');
  console.log('\nConcluído.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
