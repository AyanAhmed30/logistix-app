import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

const tests = [
  {
    name: 'apikey only',
    headers: { apikey: key, 'Content-Type': 'application/json' },
  },
  {
    name: 'apikey + Authorization Bearer',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  },
];

for (const test of tests) {
  try {
    const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      method: 'GET',
      headers: {
        ...test.headers,
        Origin: 'http://localhost:8081',
      },
    });
    const text = await res.text();
    const cors = res.headers.get('access-control-allow-origin');
    console.log(`[${test.name}] status=${res.status} cors=${cors} body=${text.slice(0, 120)}`);
  } catch (error) {
    console.log(`[${test.name}] FAILED:`, error instanceof Error ? error.message : error);
  }
}

// OPTIONS preflight simulation
try {
  const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:8081',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'apikey,authorization,content-type',
    },
  });
  console.log(
    `[OPTIONS preflight] status=${res.status} allow-origin=${res.headers.get('access-control-allow-origin')} allow-headers=${res.headers.get('access-control-allow-headers')}`,
  );
} catch (error) {
  console.log('[OPTIONS preflight] FAILED:', error instanceof Error ? error.message : error);
}
