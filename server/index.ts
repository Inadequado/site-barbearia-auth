import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { login, logout, me } from './auth.js';
import { adminRoutes } from './routes.js';

const app = new Hono();

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

const configPath = resolve(process.cwd(), 'data', 'site-config.json');
const servicesPath = resolve(process.cwd(), 'data', 'services-data.json');

// --- Rotas públicas (leitura dos JSONs do site) ---
app.get('/api/public/site-config', (c) => {
  try {
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    return c.json(data);
  } catch (e) {
    return c.json({ error: 'Falha ao ler site-config' }, 500);
  }
});

app.get('/api/public/services', (c) => {
  try {
    const data = JSON.parse(readFileSync(servicesPath, 'utf-8'));
    return c.json(data);
  } catch (e) {
    return c.json({ error: 'Falha ao ler services' }, 500);
  }
});

// --- Autenticação ---
app.post('/api/auth/login', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'JSON inválido' }, 400); }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Dados inválidos' }, 400);
  return login(c, parsed.data.username, parsed.data.password);
});

app.post('/api/auth/logout', logout);
app.get('/api/auth/me', me);

// --- Rotas admin (protegidas) ---
app.route('/api/admin', adminRoutes);

// --- Servir o frontend buildado (só em produção) ---
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server rodando em http://localhost:${info.port}`);
});