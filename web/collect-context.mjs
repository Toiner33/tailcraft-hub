#!/usr/bin/env node
/**
 * collect-context.mjs
 *
 * Dumps project files into ONE markdown file: a path heading + the code.
 * No dependencies. Needs Node 18+.
 *
 * Run it from your project root (the `web/` folder):
 *
 *   node collect-context.mjs                      # default list below
 *   node collect-context.mjs components/Foo.tsx   # default list + extra files/folders
 *   node collect-context.mjs --only app/api       # ONLY the paths you pass
 *   node collect-context.mjs --out dump.md        # custom output name
 *
 * Paths in the output look like `web/app/layout.tsx`
 * (current folder name + path relative to it).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------
// What to collect by default. Edit freely.
// Folders are dumped recursively; missing paths are just reported.
// ---------------------------------------------------------------
const DEFAULT_DUMP = [
  'types',
  'lib',
  'package.json',
  'tsconfig.json',
  'components.json',
  'next.config.ts',
  'next.config.mjs',
  'eslint.config.mjs',
  'app/globals.css',
  'app/api/servers/[serverId]/docker/status/route.ts',
  'app/api/servers/[serverId]/backups/route.ts',
];

// Folders listed as a plain file tree (names only, no content).
const DEFAULT_TREES = ['components', 'app/api'];

// ---------------------------------------------------------------
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'out', 'coverage']);
const LANG_BY_EXT = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.jsx': 'jsx',
  '.mjs': 'js',
  '.cjs': 'js',
  '.json': 'json',
  '.css': 'css',
  '.md': 'md',
};
const MAX_FILE_BYTES = 150 * 1024;

const root = process.cwd();
const rootName = path.basename(root);

// ---- CLI -------------------------------------------------------
const args = process.argv.slice(2);
let outName = 'context-dump.md';
let only = false;
const extra = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outName = args[++i];
  else if (args[i] === '--only') only = true;
  else extra.push(args[i]);
}
const outPath = path.resolve(root, outName);

// ---- helpers ---------------------------------------------------
const toPosix = (p) => p.split(path.sep).join('/');
const label = (abs) => `${rootName}/${toPosix(path.relative(root, abs))}`;
const isSecret = (name) => /^\.env/i.test(name); // never dump .env files

async function walk(dir, { anyFile = false } = {}) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const found = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) found.push(...(await walk(full, { anyFile })));
    } else if (entry.isFile() && !isSecret(entry.name)) {
      if (anyFile || path.extname(entry.name) in LANG_BY_EXT) found.push(full);
    }
  }
  return found;
}

const missing = [];

async function expand(target) {
  const abs = path.resolve(root, target);
  try {
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) return walk(abs);
    return isSecret(path.basename(abs)) ? [] : [abs];
  } catch {
    missing.push(target);
    return [];
  }
}

// Fence longer than any backtick run inside the content, so nesting never breaks.
function fenceFor(text) {
  const runs = text.match(/`+/g) ?? [];
  const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}

// ---- main ------------------------------------------------------
const dumpTargets = only ? extra : [...DEFAULT_DUMP, ...extra];
const treeTargets = only ? [] : DEFAULT_TREES;

const fileSet = new Set();
for (const target of dumpTargets) {
  for (const file of await expand(target)) {
    if (file !== outPath) fileSet.add(file);
  }
}

const parts = [];

// File trees
for (const treeDir of treeTargets) {
  const abs = path.resolve(root, treeDir);
  const files = (await walk(abs, { anyFile: true })).map(label);
  if (files.length === 0) {
    missing.push(treeDir);
    continue;
  }
  parts.push(`### Tree: ${rootName}/${treeDir}\n\n\`\`\`\n${files.join('\n')}\n\`\`\``);
}

// File contents
let included = 0;
const skipped = [];
for (const file of fileSet) {
  const stat = await fs.stat(file);
  if (stat.size > MAX_FILE_BYTES) {
    skipped.push(`${label(file)} (${Math.round(stat.size / 1024)} KB)`);
    continue;
  }
  const raw = await fs.readFile(file, 'utf8');
  const content = raw.replace(/^\uFEFF/, '').replace(/\s+$/, '');
  const lang = LANG_BY_EXT[path.extname(file)] ?? '';
  const fence = fenceFor(content);
  parts.push(`### ${label(file)}\n\n${fence}${lang}\n${content}\n${fence}`);
  included++;
}

const output = parts.join('\n\n') + '\n';
await fs.writeFile(outPath, output, 'utf8');

// ---- summary ---------------------------------------------------
console.log(`Wrote ${path.relative(root, outPath)}`);
console.log(`  files included : ${included}`);
console.log(`  characters     : ${output.length.toLocaleString()} (~${Math.round(output.length / 4).toLocaleString()} tokens)`);
if (skipped.length) console.log(`  skipped (too big): ${skipped.join(', ')}`);
if (missing.length) console.log(`  not found      : ${missing.join(', ')}`);
if (output.length > 120_000) {
  console.log('  Tip: that is big for one paste. Use --only with fewer paths and send it in chunks.');
}
