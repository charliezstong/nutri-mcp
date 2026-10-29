// Copies non-TypeScript assets (MCP Apps views) from src/ to dist/.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'src', 'ui');
const to = join(root, 'dist', 'ui');

mkdirSync(to, { recursive: true });
for (const file of readdirSync(from)) {
  if (file.endsWith('.html')) {
    cpSync(join(from, file), join(to, file));
  }
}
