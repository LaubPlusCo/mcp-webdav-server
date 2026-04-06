/**
 * Logger utility that uses the MCP SDK's logging mechanism
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Global server reference for logging
let globalMcpServer: Server | null = null;

/**
 * Set the global MCP server instance for all loggers to use
 */
export function setLoggerServer(server: Server): void {
  globalMcpServer = server;
}

interface LoggerOptions {
  server?: Server;
}

/**
 * Logger class that uses MCP SDK for logging
 */
export class Logger {
  private context: string;
  private server: Server | null;

  constructor(context: string, options: LoggerOptions = {}) {
    this.context = context;
    this.server = options.server || globalMcpServer;
  }

  /**
   * Check if logging is supported by the server
   */
  private isLoggingSupported(): boolean {
    if (!this.server) return false;

    // Check if client has registered the logging capability
    const capabilities = this.server.getClientCapabilities?.() as any;
    return capabilities?.logging !== undefined;
  }

  /**
   * Format data for logging
   */
  private formatData(message: string, data?: any): any {
    if (data === undefined) {
      return message;
    }
    
    try {
      // Handle various data types
      if (typeof data === 'string') {
        return `${message} ${data}`;
      } else if (data instanceof Error) {
        return `${message} ${data.message}\n${data.stack || ''}`;
      } else {
        return {
          message,
          data
        };
      }
    } catch (err) {
      return `${message} [Error formatting log data: ${err}]`;
    }
  }

  /**
   * Safely send a logging message to the server
   */
  private sendLogMessage(level: string, message: string, data?: any): void {
    if (!this.server || !this.isLoggingSupported()) return;
    
    try {
      this.server.sendLoggingMessage({
        level: level as any,
        logger: this.context,
        data: this.formatData(message, data)
      }).catch(() => {
        // Silently ignore any errors
      });
    } catch {
      // Silently ignore any errors
    }
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any): void {
    this.sendLogMessage('error', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    this.sendLogMessage('warning', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    this.sendLogMessage('info', message, data);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    this.sendLogMessage('debug', message, data);
  }
}

/**
 * Create a new logger with the given context
 */
export function createLogger(context: string, options: LoggerOptions = {}): Logger {
  return new Logger(context, options);
}
