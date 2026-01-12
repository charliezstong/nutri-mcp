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
 * Safe logger that doesn't interfere with stdio transport
 * In stdio mode, logs go to file only (never stdout/stderr)
 * In http mode, logs go to console
 */
interface ILogger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  child(prefix: string): ILogger;
}

class Logger implements ILogger {
  private level: LogLevel;
  private logFile: string;
  private isStdio: boolean;

  constructor() {
    const env = getEnv();
    this.level = env.LOG_LEVEL;
    this.logFile = env.LOG_FILE;
    this.isStdio = env.TRANSPORT === 'stdio';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  private writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch {
      // Silently fail - can't log errors about logging
    }
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, meta);

    if (this.isStdio) {
      // In stdio mode, NEVER write to stdout/stderr
      // Only write to log file
      this.writeToFile(formatted);
    } else {
      // In http mode, write to console
      switch (level) {
        case 'error':
          console.error(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        default:
          console.log(formatted);
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
