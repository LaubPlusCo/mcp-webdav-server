import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createAuthMiddleware, AuthOptions } from '../middleware/auth-middleware.js';
import { createLogger } from '../utils/logger.js';

export interface ExpressServerConfig {
  port: number;
  auth?: {
    username?: string;
    password?: string;
    realm?: string;
    enabled?: boolean;
  };
}

export function setupExpressServer(server: McpServer, config: ExpressServerConfig): express.Application {
  // Create logger using the server instance
  const logger = createLogger('ExpressServer');
  const app = express();
  app.use(express.json());

  // Map to store connected clients
  const clients = new Map<string, SSEServerTransport>();

  // Create auth middleware based on configuration
  const authOptions: AuthOptions = {
    username: config.auth?.username || process.env.AUTH_USERNAME,
    password: config.auth?.password || process.env.AUTH_PASSWORD,
    realm: config.auth?.realm || process.env.AUTH_REALM || 'MCP WebDAV Server',
    enabled: config.auth?.enabled ?? (process.env.AUTH_ENABLED === 'true')
  };

  // Only apply auth middleware if enabled
  if (authOptions.enabled && authOptions.username && authOptions.password) {
    const authMiddleware = createAuthMiddleware(authOptions);
    app.use(authMiddleware);
    logger.info('Authentication middleware enabled');
  } else {
    logger.info('Authentication middleware disabled');
  }

  // SSE endpoint for client connection
  app.get('/sse', async (req, res) => {
    // Create transport for this client
    const transport = new SSEServerTransport('/messages', res);
    
    // Store the transport by its session ID
    clients.set(transport.sessionId, transport);
    
    // Start the SSE connection
    await transport.start();
    
    // Connect the server to this transport
    server.connect(transport).catch(error => {
      logger.error(`Error connecting server to transport:`, error);
    });
    
    // Handle client disconnect
    req.on('close', () => {
      clients.delete(transport.sessionId);
      logger.info(`Client ${transport.sessionId} disconnected`);
    });
  });

  // Message endpoint for client to server communication
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    
    if (!sessionId || !clients.has(sessionId)) {
      res.status(400).json({ error: 'Invalid or missing session ID' });
      return;
    }
    
    const transport = clients.get(sessionId)!;
    
    try {
      await transport.handlePostMessage(req, res);
    } catch (error) {
      logger.error(`Error handling message for session ${sessionId}:`, error);
      // Note: handlePostMessage already sends appropriate response
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      name: 'WebDAV MCP Server',
      version: '1.0.0',
      description: 'MCP Server for WebDAV operations with basic authentication',
      connectedClients: clients.size
    });
  });

  // Start the server
  app.listen(config.port, () => {
    logger.info(`HTTP server with SSE transport listening on port ${config.port}`);
  });

  return app;
}
