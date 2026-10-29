import * as fs from 'node:fs';
import { getEnv } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger that is safe for the stdio transport: it never writes to stdout
 * (reserved for JSON-RPC). Logs go to stderr, which MCP hosts capture, and
 * are optionally mirrored to LOG_FILE.
 */
interface ILogger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  child(prefix: string): ILogger;
}

/**
 * JSON.stringify replacer that keeps Error details (they serialize to {} otherwise).
 */
function errorReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, ...(value as unknown as Record<string, unknown>) };
  }
  return value;
}

class Logger implements ILogger {
  private level: LogLevel;
  private logFile: string | undefined;

  constructor() {
    const env = getEnv();
    this.level = env.LOG_LEVEL;
    this.logFile = env.LOG_FILE;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    let metaStr = '';
    if (meta !== undefined) {
      try {
        metaStr = ` ${JSON.stringify(meta, errorReplacer)}`;
      } catch {
        metaStr = ' [unserializable meta]';
      }
    }
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, meta);
    process.stderr.write(formatted + '\n');

    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, formatted + '\n');
      } catch {
        // Ignore: logging must never break the server
      }
    }
  }

  debug(message: string, meta?: unknown): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.log('error', message, meta);
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): ILogger {
    return new ChildLogger(this, prefix);
  }
}

class ChildLogger implements ILogger {
  constructor(
    private parent: ILogger,
    private prefix: string,
  ) {}

  private prefixed(message: string): string {
    return `[${this.prefix}] ${message}`;
  }

  debug(message: string, meta?: unknown): void {
    this.parent.debug(this.prefixed(message), meta);
  }

  info(message: string, meta?: unknown): void {
    this.parent.info(this.prefixed(message), meta);
  }

  warn(message: string, meta?: unknown): void {
    this.parent.warn(this.prefixed(message), meta);
  }

  error(message: string, meta?: unknown): void {
    this.parent.error(this.prefixed(message), meta);
  }

  child(prefix: string): ILogger {
    return new ChildLogger(this, `${this.prefix}:${prefix}`);
  }
}

// Singleton logger instance
let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

export type { ILogger as Logger };
