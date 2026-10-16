import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const cwd = fileURLToPath(new URL('../', import.meta.url));

function loadConfig(databaseUrl) {
  const env = { ...process.env, DOTENV_CONFIG_PATH: '/dev/null' };
  delete env.DATABASE_URL;
  if (databaseUrl !== undefined) env.DATABASE_URL = databaseUrl;
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--input-type=module', '-e',
    `import config from './prisma.config.ts';
     console.log(JSON.stringify({ url: config.datasource?.url ?? null }));`,
  ], { cwd, env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
}

test('Prisma config loads without database credentials for client generation', () => {
  assert.equal(loadConfig().url, null);
});

test('Prisma config preserves a supplied database URL for database commands', () => {
  const url = 'postgresql://localhost:55432/apextraders?sslmode=require';
  assert.equal(loadConfig(url).url, url);
});
