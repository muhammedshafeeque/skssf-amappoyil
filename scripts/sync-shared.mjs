#!/usr/bin/env node
// Copies functions/src/shared (types, Zod schemas, helpers) into admin/src/shared and
// mobile/src/shared. Run after editing the shared files; `--check` fails if copies drift (CI).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const src = join(root, 'functions/src/shared');
const targets = ['admin/src/shared', 'mobile/src/shared'].map((t) => join(root, t));
const files = readdirSync(src).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const header = '// GENERATED from functions/src/shared by scripts/sync-shared.mjs — edit there, not here.\n';
const check = process.argv.includes('--check');
let drift = false;

for (const target of targets) {
  if (!existsSync(join(target, '..'))) continue;
  for (const f of files) {
    const want = header + readFileSync(join(src, f), 'utf8');
    const path = join(target, f);
    if (check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== want) {
        console.error(`out of date: ${path}`);
        drift = true;
      }
    } else {
      mkdirSync(target, { recursive: true });
      writeFileSync(path, want);
    }
  }
  if (!check) {
    for (const f of readdirSync(target)) if (!files.includes(f)) rmSync(join(target, f));
    console.log(`synced ${files.length} files → ${target.replace(root, '')}`);
  }
}
process.exit(drift ? 1 : 0);
