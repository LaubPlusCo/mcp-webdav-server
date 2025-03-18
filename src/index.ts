#!/usr/bin/env node

import 'dotenv/config';
import { startWebDAVServer } from './lib.js';

async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const useHttp = args.includes('--http');
    
    // Start the server
    await startWebDAVServer({
      webdavConfig: {
        rootUrl: process.env.WEBDAV_ROOT_URL || 'http://localhost:4080',
        rootPath: process.env.WEBDAV_ROOT_PATH || '/',
        username: process.env.WEBDAV_USERNAME || 'admin',
        password: process.env.WEBDAV_PASSWORD || 'password'
      },
      useHttp,
      httpConfig: useHttp ? {
        port: parseInt(process.env.SERVER_PORT || '3000', 10),
        authUsername: process.env.AUTH_USERNAME || 'user',
        authPassword: process.env.AUTH_PASSWORD || 'pass'
      } : undefined
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

// Export library functions for programmatic usage
export * from './lib.js';
