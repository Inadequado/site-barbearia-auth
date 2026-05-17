import type { Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((res, rej) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try { res(JSON.parse(body)); } catch (e) { rej(e); }
    });
    req.on('error', rej);
  });
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function adminPlugin(): Plugin {
  return {
    name: 'vite-admin-plugin',
    apply: 'serve',
    configureServer(server) {
      const root = process.cwd();
      const configPath = resolve(root, './data/site-config.json');
      const servicesPath = resolve(root, './data/services-data.json');

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/admin/')) { next(); return; }
        if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }

        try {
          const data = await readBody(req);

          if (req.url === '/api/admin/save/home') {
            const current = JSON.parse(readFileSync(configPath, 'utf-8'));
            const { heroLine1, heroName, ctaLabel } = data as Record<string, string>;
            writeFileSync(configPath, JSON.stringify({ ...current, heroLine1, heroName, ctaLabel }, null, 2), 'utf-8');

          } else if (req.url === '/api/admin/save/categories') {
            const current = JSON.parse(readFileSync(configPath, 'utf-8'));
            writeFileSync(configPath, JSON.stringify({ ...current, categories: data }, null, 2), 'utf-8');

          } else if (req.url === '/api/admin/save/services') {
            writeFileSync(servicesPath, JSON.stringify(data, null, 2), 'utf-8');

          } else {
            next(); return;
          }

          json(res, 200, { ok: true });
        } catch (e) {
          json(res, 500, { error: String(e) });
        }
      });
    },
  };
}
