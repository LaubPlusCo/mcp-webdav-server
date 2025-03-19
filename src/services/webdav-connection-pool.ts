import { createClient, WebDAVClient, AuthType } from 'webdav';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WebDAVConnectionPool');

interface WebDAVConnectionOptions {
  rootUrl: string;
  username?: string;
  password?: string;
  authEnabled?: boolean;
}

interface PooledConnection {
  client: WebDAVClient;
  lastUsed: number;
  connectionKey: string;
}

/**
 * WebDAV Connection Pool for reusing connections
 */
export class WebDAVConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private maxIdleTimeMs: number;
  private maxConnections: number;

  /**
   * Create a new WebDAV connection pool
   * 
   * @param options Pool configuration options
   */
  constructor(options: {
    maxIdleTimeMs?: number; // Maximum time in ms a connection can be idle before being removed
    maxConnections?: number; // Maximum number of connections to keep in the pool
    cleanupIntervalMs?: number; // How often to check for idle connections
  } = {}) {
    this.maxIdleTimeMs = options.maxIdleTimeMs || 5 * 60 * 1000; // Default: 5 minutes
    this.maxConnections = options.maxConnections || 10; // Default: 10 connections
    const cleanupIntervalMs = options.cleanupIntervalMs || 60 * 1000; // Default: 1 minute
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, cleanupIntervalMs);
    
    // Ensure cleanup happens even if the process exits
    process.on('exit', () => {
      this.destroy();
    });
  }

  /**
   * Generate a unique key for a connection based on its options
   * 
   * @param options Connection options
   * @returns Connection key
   */
  private generateConnectionKey(options: WebDAVConnectionOptions): string {
    const { rootUrl, authEnabled, username } = options;
    // Include authentication details in key only if auth is enabled
    return authEnabled 
      ? `${rootUrl}:${authEnabled}:${username}`
      : `${rootUrl}:${authEnabled}`;
  }

  /**
   * Get a WebDAV client from the pool or create a new one
   * 
   * @param options Connection options
   * @returns WebDAV client
   */
  getConnection(options: WebDAVConnectionOptions): WebDAVClient {
    const connectionKey = this.generateConnectionKey(options);
    
    // Check if we have a connection in the pool
    if (this.connections.has(connectionKey)) {
      const connection = this.connections.get(connectionKey)!;
      // Update last used timestamp
      connection.lastUsed = Date.now();
      logger.debug(`Reusing existing WebDAV connection: ${connectionKey}`);
      return connection.client;
    }
    
    // If we've reached the max connections, remove the oldest one
    if (this.connections.size >= this.maxConnections) {
      this.removeOldestConnection();
    }
    
    // Create new client
    logger.debug(`Creating new WebDAV connection: ${connectionKey}`);
    const client = this.createClient(options);
    
    // Add to pool
    this.connections.set(connectionKey, {
      client,
      lastUsed: Date.now(),
      connectionKey
    });
    
    return client;
  }

  /**
   * Create a new WebDAV client
   * 
   * @param options Connection options
   * @returns WebDAV client
   */
  private createClient(options: WebDAVConnectionOptions): WebDAVClient {
    const { rootUrl, authEnabled, username, password } = options;
    
    if (authEnabled && username && password) {
      // Create authenticated client with plain text password
      logger.debug(`Creating authenticated WebDAV client for ${rootUrl}`);
      return createClient(rootUrl, {
        authType: AuthType.Password,
        username,
        password // Password must be in plain text for WebDAV authentication
      });
    } else {
      // Create unauthenticated client
      logger.debug(`Creating unauthenticated WebDAV client for ${rootUrl}`);
      return createClient(rootUrl, {
        authType: AuthType.None
      });
    }
  }

  /**
   * Remove the oldest connection from the pool
   */
  private removeOldestConnection(): void {
    if (this.connections.size === 0) return;
    
    let oldestKey = '';
    let oldestTime = Infinity;
    
    // Find the oldest connection
    for (const [key, connection] of this.connections.entries()) {
      if (connection.lastUsed < oldestTime) {
        oldestTime = connection.lastUsed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      logger.debug(`Removing oldest connection: ${oldestKey}`);
      this.connections.delete(oldestKey);
    }
  }

  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, connection] of this.connections.entries()) {
      const idleTime = now - connection.lastUsed;
      
      if (idleTime > this.maxIdleTimeMs) {
        logger.debug(`Removing idle connection: ${key}, idle for ${idleTime}ms`);
        this.connections.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} idle WebDAV connections, ${this.connections.size} remaining`);
    }
  }

  /**
   * Get statistics about the connection pool
   */
  getStats() {
    return {
      activeConnections: this.connections.size,
      maxConnections: this.maxConnections,
      connectionKeys: Array.from(this.connections.keys())
    };
  }

  /**
   * Destroy the connection pool and clean up resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.connections.clear();
    logger.info('WebDAV connection pool destroyed');
  }
}

// Create and export a singleton instance
export const webdavConnectionPool = new WebDAVConnectionPool();
