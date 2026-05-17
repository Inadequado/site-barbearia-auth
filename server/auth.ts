import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

const usersPath = resolve(process.cwd(), 'data', 'users.json');
const SECRET = process.env.SESSION_SECRET;
if (!SECRET) throw new Error('SESSION_SECRET não definido no .env');

const COOKIE_NAME = 'admin_session';
const TOKEN_TTL = '8h';

type User = { username: string; passwordHash: string };

function loadUsers(): User[] {
  return JSON.parse(readFileSync(usersPath, 'utf-8'));
}

// Rate limiting simples em memória: 5 tentativas / 15min por IP
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function resetRateLimit(ip: string) {
  attempts.delete(ip);
}

export async function login(c: Context, username: string, password: string) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim()
    || c.req.header('x-real-ip')
    || 'unknown';

  if (!checkRateLimit(ip)) {
    return c.json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' }, 429);
  }

  const users = loadUsers();
  const user = users.find(u => u.username === username);

  // Sempre roda bcrypt (mesmo se user não existe) pra evitar timing attack
  const hashToCheck = user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hashToCheck);

  if (!user || !ok) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  resetRateLimit(ip);

  const token = jwt.sign({ sub: user.username }, SECRET!, { expiresIn: TOKEN_TTL });

  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return c.json({ ok: true, username: user.username });
}

export function logout(c: Context) {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
  return c.json({ ok: true });
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return c.json({ error: 'Não autenticado' }, 401);

  try {
    const payload = jwt.verify(token, SECRET!) as { sub: string };
    c.set('user', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Sessão expirada' }, 401);
  }
};

export function me(c: Context) {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return c.json({ authenticated: false });
  try {
    const payload = jwt.verify(token, SECRET!) as { sub: string };
    return c.json({ authenticated: true, username: payload.sub });
  } catch {
    return c.json({ authenticated: false });
  }
}