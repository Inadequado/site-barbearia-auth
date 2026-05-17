import { Hono } from 'hono';
import { z } from 'zod';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireAuth } from './auth.js';

const configPath = resolve(process.cwd(), 'data', 'site-config.json');
const servicesPath = resolve(process.cwd(), 'data', 'services-data.json');

const homeSchema = z.object({
  heroLine1: z.string().min(1).max(200),
  heroName: z.string().min(1).max(100),
  ctaLabel: z.string().min(1).max(50),
});

const categorySchema = z.object({
  id: z.string(),
  label: z.string(),
  active: z.boolean(),
}).passthrough();

const categoriesSchema = z.array(categorySchema);

const serviceSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'slug deve ter apenas letras minúsculas, números e hífens'),
  category: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  desc: z.string().min(1).max(500),
  price: z.string().min(1).max(50),
});

const servicesSchema = z.array(serviceSchema)
  .refine(arr => new Set(arr.map(s => s.id)).size === arr.length, { message: 'IDs duplicados' })
  .refine(arr => new Set(arr.map(s => s.slug)).size === arr.length, { message: 'slugs duplicados' });

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

export const adminRoutes = new Hono();

adminRoutes.use('*', requireAuth);

adminRoutes.post('/save/home', async (c) => {
  const body = await c.req.json();
  const parsed = homeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.issues }, 400);
  }
  const current = readJson(configPath);
  writeJson(configPath, { ...current, ...parsed.data });
  return c.json({ ok: true });
});

adminRoutes.post('/save/categories', async (c) => {
  const body = await c.req.json();
  const parsed = categoriesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.issues }, 400);
  }
  const current = readJson(configPath);
  writeJson(configPath, { ...current, categories: parsed.data });
  return c.json({ ok: true });
});

adminRoutes.post('/save/services', async (c) => {
  const body = await c.req.json();
  const parsed = servicesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.issues }, 400);
  }
  writeJson(servicesPath, parsed.data);
  return c.json({ ok: true });
});