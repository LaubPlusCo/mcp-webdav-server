import { Request, Response, NextFunction } from 'express';
import auth from 'basic-auth';
import { verifyPassword } from '../utils/password-utils.js';

export interface AuthOptions {
  username?: string;
  password?: string;
  realm?: string;
  enabled?: boolean;
}

export function createAuthMiddleware(options: AuthOptions) {
  const {
    username, 
    password, 
    realm = 'MCP WebDAV Server',
    enabled = true
  } = options;

  // If authentication is disabled or credentials are not provided, return a middleware that just calls next()
  if (!enabled || !username || !password) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const credentials = auth(req);
    
    if (!credentials) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).send('Unauthorized: Authentication required');
      return;
    }

    // Check username match first
    if (credentials.name !== username) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).send('Unauthorized: Invalid credentials');
      return;
    }
    
    // Check password using the password utils
    const isPasswordValid = await verifyPassword(credentials.pass, password);
    
    if (!isPasswordValid) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).send('Unauthorized: Invalid credentials');
      return;
    }
    
    next();
  };
}
