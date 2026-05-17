import bcrypt from 'bcrypt';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

const usersPath = resolve(process.cwd(), 'data', 'users.json');

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const username = (await rl.question('Username: ')).trim();
  const password = (await rl.question('Password: ')).trim();
  rl.close();

  if (!username || !password) {
    console.error('Username e password são obrigatórios.');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Use uma senha com pelo menos 10 caracteres.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  type User = { username: string; passwordHash: string };
  const users: User[] = existsSync(usersPath)
    ? JSON.parse(readFileSync(usersPath, 'utf-8'))
    : [];

  const existing = users.findIndex(u => u.username === username);
  if (existing >= 0) {
    users[existing] = { username, passwordHash };
    console.log(`Usuário "${username}" atualizado.`);
  } else {
    users.push({ username, passwordHash });
    console.log(`Usuário "${username}" criado.`);
  }

  writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');
}

main().catch(e => { console.error(e); process.exit(1); });