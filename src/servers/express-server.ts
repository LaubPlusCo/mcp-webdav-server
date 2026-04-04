import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
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
  const logger = createLogger('ExpressServer');
  const app = express();
  app.use(express.json());

  const clients = new Map<string, { transport: StreamableHTTPServerTransport; createdAt: number }>();

  const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of clients) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        clients.delete(id);
        logger.info(`Session ${id} expired after TTL`);
      }
    }
  }, 5 * 60 * 1000).unref();

  const authOptions: AuthOptions = {
    username: config.auth?.username || process.env.AUTH_USERNAME,
    password: config.auth?.password || process.env.AUTH_PASSWORD,
    realm: config.auth?.realm || process.env.AUTH_REALM || 'MCP WebDAV Server',
    enabled: config.auth?.enabled ?? (process.env.AUTH_ENABLED === 'true')
  };

  if (authOptions.enabled && authOptions.username && authOptions.password) {
    app.use(createAuthMiddleware(authOptions));
    logger.info('Authentication middleware enabled');
  } else {
    logger.info('Authentication middleware disabled');
  }

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && clients.has(sessionId)) {
      await clients.get(sessionId)!.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          clients.set(id, { transport, createdAt: Date.now() });
          logger.info(`Client ${id} connected`);
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          clients.delete(transport.sessionId);
          logger.info(`Client ${transport.sessionId} disconnected`);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({ error: 'Invalid request: missing or unknown session ID' });
  });

  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !clients.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await clients.get(sessionId)!.transport.handleRequest(req, res);
  });

  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !clients.has(sessionId)) {
      res.status(404).send('Session not found');
      return;
    }
    const { transport } = clients.get(sessionId)!;
    await transport.handleRequest(req, res);
    clients.delete(sessionId);
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      name: 'WebDAV MCP Server',
      version: '1.0.0',
      description: 'MCP Server for WebDAV operations with basic authentication',
      connectedClients: clients.size
    });
  });

  app.listen(config.port, () => {
    logger.info(`HTTP server with StreamableHTTP transport listening on port ${config.port}`);
  });

  return app;
}
