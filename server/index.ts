import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { z } from 'zod';
import { login, logout, me } from './auth.js';
import { adminRoutes } from './routes.js';

const app = new Hono();

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
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