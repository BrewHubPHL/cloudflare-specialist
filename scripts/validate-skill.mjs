#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SKILL_NAME = 'cloudflare-specialist';

const REQUIRED_FILES = [
  'SKILL.md', 'README.md', 'AGENTS.md', 'anti-patterns.md',
  'patterns/workers-fundamentals.md', 'patterns/wrangler-config.md',
  'patterns/bindings-storage.md', 'patterns/durable-objects.md',
  'patterns/queues-cron.md', 'patterns/zero-trust-tunnels.md',
  'patterns/opennext-nextjs.md', 'examples/brew-hub-integration.md',
  'references/official-docs-links.md',
];

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

let failed = false;
for (const rel of REQUIRED_FILES) {
  if (!existsSync(join(root, rel))) { console.error(`MISSING: ${rel}`); failed = true; }
}
const fm = parseFrontmatter(readFileSync(join(root, 'SKILL.md'), 'utf8'));
if (!fm?.name || !fm?.description) { console.error('SKILL.md: bad frontmatter'); failed = true; }
if (fm?.name !== SKILL_NAME) { console.error(`name must be ${SKILL_NAME}`); failed = true; }
if (failed) process.exit(1);
console.log('validate-skill: OK');
