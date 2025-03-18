import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupPromptHandlers(server: McpServer) {
  // Prompt for creating a new file
  server.prompt(
    'webdav_create_file',
    {
      path: z.string().min(1, 'Path must not be empty'),
      content: z.string(),
      description: z.string().optional()
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a new file in WebDAV at path "${args.path}"${args.description ? ` with the following description: ${args.description}` : ''}.

File content:
${args.content}

Please execute this operation and confirm when complete.`
          }
        }
      ]
    })
  );

  // Prompt for reading a file
  server.prompt(
    'webdav_read_file',
    {
      path: z.string().min(1, 'Path must not be empty')
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Read the file located at "${args.path}" in WebDAV and display its contents.`
          }
        }
      ]
    })
  );

  // Prompt for updating a file
  server.prompt(
    'webdav_update_file',
    {
      path: z.string().min(1, 'Path must not be empty'),
      content: z.string(),
      reason: z.string().optional()
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Update the file at "${args.path}" in WebDAV${args.reason ? ` for the following reason: ${args.reason}` : ''}.

New content:
${args.content}

Please execute this update and confirm when complete.`
          }
        }
      ]
    })
  );

  // Prompt for deleting a file or directory
  server.prompt(
    'webdav_delete',
    // The issue is with boolean not being compatible with the prompt schema
    // Using string as a workaround
    {
      path: z.string().min(1, 'Path must not be empty'),
      confirm: z.string().optional()
    },
    (args) => {
      const confirmationEnabled = args.confirm !== 'false';
      const pathValue = args.path;
      const isDirectory = pathValue.endsWith('/');
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Delete the ${isDirectory ? 'directory' : 'file'} at "${pathValue}" in WebDAV.
${confirmationEnabled ? 'Please confirm this action to proceed with deletion.' : 'Execute this deletion operation.'}

Please confirm when the deletion is complete.`
            }
          }
        ]
      };
    }
  );

  // Prompt for listing directory contents
  server.prompt(
    'webdav_list_directory',
    {
      path: z.string().optional()
    },
    (args) => {
      const pathToUse = args.path || '/';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `List all files and directories in the WebDAV directory "${pathToUse}".

Please provide a well-formatted list showing:
- File/directory names
- Types (file or directory)
- Sizes (for files)
- Last modified dates (if available)`
            }
          }
        ]
      };
    }
  );

  // Prompt for creating a directory
  server.prompt(
    'webdav_create_directory',
    {
      path: z.string().min(1, 'Path must not be empty')
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a new directory in WebDAV at path "${args.path}".

Please execute this operation and confirm when complete.`
          }
        }
      ]
    })
  );

  // Prompt for moving/renaming a file or directory
  server.prompt(
    'webdav_move',
    {
      fromPath: z.string().min(1, 'Source path must not be empty'),
      toPath: z.string().min(1, 'Destination path must not be empty'),
      reason: z.string().optional()
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Move/rename the file or directory from "${args.fromPath}" to "${args.toPath}" in WebDAV${args.reason ? ` for the following reason: ${args.reason}` : ''}.

Please execute this operation and confirm when complete.`
          }
        }
      ]
    })
  );

  // Prompt for copying a file or directory
  server.prompt(
    'webdav_copy',
    {
      fromPath: z.string().min(1, 'Source path must not be empty'),
      toPath: z.string().min(1, 'Destination path must not be empty')
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Copy the file or directory from "${args.fromPath}" to "${args.toPath}" in WebDAV.

Please execute this operation and confirm when complete.`
          }
        }
      ]
    })
  );
}
