#!/usr/bin/env node

import 'dotenv/config';
import { startWebDAVServer } from './lib.js';
import { createLogger } from './utils/logger.js';

async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const useHttp = args.includes('--http');
    
    // Prepare WebDAV config with optional authentication
    const webdavConfig: any = {
      rootUrl: process.env.WEBDAV_ROOT_URL || 'http://localhost:4080',
      rootPath: process.env.WEBDAV_ROOT_PATH || '/',
      authEnabled: process.env.WEBDAV_AUTH_ENABLED === 'true'
    };
    
    // Only add credentials if authentication is enabled
    if (webdavConfig.authEnabled) {
      webdavConfig.username = process.env.WEBDAV_USERNAME;
      webdavConfig.password = process.env.WEBDAV_PASSWORD;
    }
    
    // Prepare HTTP config with optional authentication
    const httpConfig = useHttp ? {
      port: parseInt(process.env.SERVER_PORT || '3000', 10),
      auth: {
        enabled: process.env.AUTH_ENABLED === 'true',
        username: process.env.AUTH_USERNAME,
        password: process.env.AUTH_PASSWORD,
        realm: process.env.AUTH_REALM
      }
    } : undefined;
    
    // Start the server
    await startWebDAVServer({
      webdavConfig,
      useHttp,
      httpConfig
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

// Export library functions for programmatic usage
export * from './lib.js';
