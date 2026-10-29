import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Package version, read from package.json so it is defined in one place.
 * Works from both `src/` (tsx) and `dist/` (compiled), which sit one level
 * below the package root.
 */
export const VERSION: string = (require('../package.json') as { version: string }).version;

export const SERVER_NAME = 'nutri-mcp';
