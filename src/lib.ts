import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { WebDAVService, WebDAVConfig } from './services/webdav-service.js';
import { setupResourceHandlers } from './handlers/resource-handlers.js';
import { setupToolHandlers } from './handlers/tool-handlers.js';
import { setupPromptHandlers } from './handlers/prompt-handlers.js';
import { setupExpressServer } from './servers/express-server.js';
import { validateConfig, ValidatedServerOptions } from './config/validation.js';
import { createLogger, setLoggerServer } from './utils/logger.js';
import { webdavConnectionPool } from './services/webdav-connection-pool.js';

// Logger will be initialized after server creation

export interface HttpServerConfig {
  port: number;
  auth?: {
    username?: string;
    password?: string;
    realm?: string;
    enabled?: boolean;
  };
}

export interface ServerOptions {
  webdavConfig: WebDAVConfig;
  useHttp?: boolean;
  httpConfig?: HttpServerConfig;
}

/**
 * Start the WebDAV MCP Server with the provided configuration
 * 
 * @param options Server configuration options
 * @returns A promise that resolves when the server is started
 */
export async function startWebDAVServer(options: ServerOptions): Promise<void> {
  try {
    // Validate the configuration
    const validatedOptions = validateConfig(options);
    const { webdavConfig, useHttp, httpConfig } = validatedOptions;
    
    // Initialize the WebDAV service
    const webdavService = new WebDAVService(webdavConfig);

    // Create the MCP server
    const server = new McpServer({
      name: 'WebDAV Server',
      version: '1.0.1',
      description: 'MCP Server for WebDAV operations with configurable authentication',
      capabilities: {
        logging: {},     // Support for logging
        prompts: {},     // Support for prompts
        resources: {},   // Support for resources
        tools: {}        // Support for tools
      }
    });
    
    // Set the MCP server for all loggers to use
    setLoggerServer(server.server);
    
    // Now that the server is set up, we can create a logger
    const logger = createLogger('WebDAVServer');
    
    // Log startup information
    logger.info('WebDAV MCP Server started', {
      webdavUrl: webdavConfig.rootUrl,
      webdavAuthEnabled: webdavConfig.authEnabled,
      useHttp,
      httpPort: useHttp ? httpConfig?.port : undefined,
      httpAuthEnabled: useHttp ? httpConfig?.auth?.enabled : undefined
    });
    
    // Set up handlers
    logger.debug('Setting up MCP handlers');
    
    setupResourceHandlers(server, webdavService);
    setupToolHandlers(server, webdavService);
    setupPromptHandlers(server);

    // Get connection pool stats for logging
    const poolStats = webdavConnectionPool.getStats();
    logger.info('WebDAV connection pool status', poolStats);

    if (useHttp) {
      // Start Express server with SSE transport
      logger.info(`Starting HTTP server on port ${httpConfig!.port}`);
      setupExpressServer(server, {
        port: httpConfig!.port,
        auth: httpConfig!.auth
      });
      logger.info(`HTTP server started on port ${httpConfig!.port}`);
    } else {
      // Use stdio transport
      logger.info('Starting server with stdio transport');
      const transport = new StdioServerTransport();
      await server.connect(transport);
      logger.info('Server connected with stdio transport');
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Re-export types
export { WebDAVConfig, WebDAVService } from './services/webdav-service.js';
