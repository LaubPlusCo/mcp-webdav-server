import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebDAVService } from '../services/webdav-service.js';

export function setupResourceHandlers(server: McpServer, webdavService: WebDAVService) {
  // List files in a directory
  server.resource(
    'webdav_list_directory',
    new ResourceTemplate('webdav://{path}/list', {
      // The list property expects a proper response format
      list: async () => {
        return {
          resources: [
            {
              uri: 'webdav://',
              name: 'WebDAV Root',
              description: 'Access to WebDAV resources'
            }
          ]
        };
      }
    }),
    async (uri, { path }) => {
      try {
        const normalizedPath = path ? String(path) : '/';
        const files = await webdavService.list(normalizedPath);
        
        // Format the file listing for display
        const content = files.map(file => {
          const type = file.type === 'directory' ? 'Directory' : 'File';
          const size = file.type === 'file' ? `Size: ${formatSize(file.size)}` : '';
          const lastMod = file.lastmod ? `Last Modified: ${file.lastmod}` : '';
          
          return `${type}: ${file.basename}
${size}
${lastMod}
Path: ${file.filename}
${'-'.repeat(40)}`;
        }).join('\n');
        
        return {
          contents: [{
            uri: uri.href,
            text: content ? content : 'Empty directory'
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Error listing directory: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // Get file content
  server.resource(
    'webdav_get_file',
    new ResourceTemplate('webdav://{path}/content', {
      list: undefined,
    }),
    async (uri, { path }) => {
      try {
        if (!path) {
          throw new Error('Path parameter is required');
        }
        
        // Ensure path is treated as a string
        const pathString = String(path);
        const content = await webdavService.readFile(pathString);
        
        return {
          contents: [{
            uri: uri.href,
            text: content
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Error reading file: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // Get file or directory info
  server.resource(
    'webdav_get_info',
    new ResourceTemplate('webdav://{path}/info', {
      list: undefined,
    }),
    async (uri, { path }) => {
      try {
        if (!path) {
          throw new Error('Path parameter is required');
        }
        
        // Ensure path is treated as a string
        const pathString = String(path);
        const stat = await webdavService.stat(pathString);
        
        // Format the file information
        const info = [
          `Name: ${stat.basename}`,
          `Type: ${stat.type}`,
          `Path: ${stat.filename}`,
          stat.type === 'file' ? `Size: ${formatSize(stat.size)}` : '',
          stat.lastmod ? `Last Modified: ${stat.lastmod}` : '',
          `Mime Type: ${stat.mime || 'unknown'}`
        ].filter(Boolean).join('\n');
        
        return {
          contents: [{
            uri: uri.href,
            text: info
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Error getting info: ${(error as Error).message}`
          }]
        };
      }
    }
  );
}

// Helper function to format file size
function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
