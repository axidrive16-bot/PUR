import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let value = trimmed.slice(idx + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const checks = [];
function record(name, ok, detail) { checks.push({ name, ok, detail }); }

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || (!service && !anon)) {
    record('Supabase', false, 'Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key');
    return;
  }

  const key = service || anon;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  if (service) {
    const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    record('Supabase admin auth', !error, error?.message ?? 'service role can list users');
  } else {
    const { error } = await client.auth.getSession();
    record('Supabase client auth', !error, error?.message ?? 'anon client can initialize');
  }
}

async function checkFmp() {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    record('FMP', false, 'Missing FMP_API_KEY');
    return;
  }

  const url = `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    record('FMP', false, `${res.status} ${res.statusText}`);
    return;
  }
  const data = await res.json();
  record('FMP', Array.isArray(data) && data.length > 0, Array.isArray(data) && data.length > 0 ? 'quote endpoint returned data' : 'quote endpoint returned no data');
}

try {
  await Promise.all([checkSupabase(), checkFmp()]);
} catch (error) {
  record('Connection check', false, error instanceof Error ? error.message : String(error));
}

let failed = 0;
for (const check of checks) {
  if (!check.ok) failed += 1;
  console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.detail}`);
}

process.exitCode = failed ? 1 : 0;
