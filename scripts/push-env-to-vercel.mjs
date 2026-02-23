#!/usr/bin/env node
/**
 * Legge .env.local e invia le variabili richieste a Vercel (production).
 * Esegui dalla root del progetto: node scripts/push-env-to-vercel.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';

const VAR_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
];

const envPath = join(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.error('File .env.local non trovato. Crealo con le variabili necessarie.');
  process.exit(1);
}

const raw = readFileSync(envPath, 'utf8');
const env = {};
raw.split('\n').forEach((line) => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

const missing = VAR_NAMES.filter((n) => !env[n]);
if (missing.length) {
  console.error('Variabili mancanti in .env.local:', missing.join(', '));
  process.exit(1);
}

for (const name of VAR_NAMES) {
  const value = env[name];
  const r = spawnSync(
    'npx',
    ['vercel', 'env', 'add', name, 'production', '--yes', '--force'],
    { stdio: ['pipe', 'inherit', 'inherit'], input: value, encoding: 'utf8', cwd: process.cwd() }
  );
  if (r.status === 0) {
    console.log('OK:', name);
  } else {
    console.warn('Fallito', name, '- impostala da Vercel Dashboard → Settings → Environment Variables');
  }
}

console.log('Fatto. Vercel → Deployments → Redeploy per applicare le variabili.');
