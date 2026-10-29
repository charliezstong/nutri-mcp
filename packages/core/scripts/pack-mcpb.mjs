// Builds an MCP Bundle (.mcpb) for one-click install in Claude Desktop and
// other MCPB-compatible hosts. Run after `pnpm build`.
//
//   pnpm pack:mcpb  ->  nutri-mcp-<version>.mcpb
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'build', 'mcpb');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!existsSync(join(root, 'dist', 'index.js'))) {
  throw new Error('dist/ not found: run `pnpm build` first');
}

// Ask the built server for its tools and prompts so the manifest never drifts
const client = new Client({ name: 'pack-mcpb', version: pkg.version });
await client.connect(new StdioClientTransport({
  command: process.execPath,
  args: [join(root, 'dist', 'index.js')],
  env: { ...process.env, LOG_LEVEL: 'error' },
  stderr: 'ignore',
}));
const { tools } = await client.listTools();
const { prompts } = await client.listPrompts();
await client.close();

const manifest = JSON.parse(readFileSync(join(root, 'mcpb', 'manifest.json'), 'utf8'));
manifest.version = pkg.version;
manifest.tools = tools.map((t) => ({ name: t.name, description: t.description }));
manifest.prompts = prompts.map((p) => ({ name: p.name, description: p.description, text: p.description ?? p.name }));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'dist'), join(out, 'dist'), { recursive: true, filter: (src) => !src.endsWith('.map') && !src.endsWith('.d.ts') });
cpSync(join(root, 'mcpb', 'icon.png'), join(out, 'icon.png'));
cpSync(join(root, '..', '..', 'LICENSE'), join(out, 'LICENSE'));
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(out, 'package.json'), JSON.stringify({
  name: pkg.name,
  version: pkg.version,
  type: 'module',
  private: true,
  dependencies: pkg.dependencies,
}, null, 2) + '\n');

// Production dependencies only, flat node_modules (npm, not the pnpm store)
execFileSync('npm', ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock'], { cwd: out, stdio: 'inherit' });

const target = join(root, `${pkg.name}-${pkg.version}.mcpb`);
execFileSync('npx', ['-y', '@anthropic-ai/mcpb@2', 'validate', join(out, 'manifest.json')], { stdio: 'inherit' });
execFileSync('npx', ['-y', '@anthropic-ai/mcpb@2', 'pack', out, target], { stdio: 'inherit' });
console.log(`\nCreated ${target}`);
