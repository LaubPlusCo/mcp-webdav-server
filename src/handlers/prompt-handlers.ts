import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupPromptHandlers(server: McpServer) {
  // Prompt for creating a new file
  server.prompt(
    'webdav_create_remote_file',
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
            text: `Create a new file on the remote WebDAV server at path "${args.path}"${args.description ? ` with the following description: ${args.description}` : ''}.

Content to save on the remote WebDAV server:
${args.content}

Please execute this remote WebDAV operation and confirm when complete.`
          }
        }
      ]
    })
  );

  // Prompt for reading a file
  server.prompt(
    'webdav_get_remote_file',
    {
      path: z.string().min(1, 'Path must not be empty')
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Retrieve the content of the file located at "${args.path}" from the remote WebDAV server and display its contents.`
          }
        }
      ]
    })
  );

  // Prompt for updating a file
  server.prompt(
    'webdav_update_remote_file',
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
            text: `Update the existing file at "${args.path}" on the remote WebDAV server${args.reason ? ` for the following reason: ${args.reason}` : ''}.

New content to save on the remote WebDAV server:
${args.content}

Please execute this remote WebDAV update operation and confirm when complete.`
          }
        }
      ]
    })
  );

  // Prompt for deleting a file or directory
  server.prompt(
    'webdav_delete_remote_item',
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
              text: `Delete the ${isDirectory ? 'directory' : 'file'} at "${pathValue}" from the remote WebDAV server.
${confirmationEnabled ? 'Please confirm this action to proceed with deletion.' : 'Execute this remote deletion operation.'}

Please confirm when the remote WebDAV deletion is complete.`
            }
          }
        ]
      };
    }
  );

  // Prompt for listing directory contents
  server.prompt(
    'webdav_list_remote_directory',
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
              text: `List all files and directories in the remote WebDAV directory "${pathToUse}".

Please provide a well-formatted list showing:
- File/directory names
- Types (file or directory)
- Sizes (for files)
- Last modified dates (if available)

This is for a remote WebDAV server, not a local filesystem.`
            }
          }
        ]
      };
    }
  );

  // Prompt for creating a directory
  server.prompt(
    'webdav_create_remote_directory',
    {
      path: z.string().min(1, 'Path must not be empty')
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a new directory on the remote WebDAV server at path "${args.path}".

Please execute this remote WebDAV operation and confirm when the directory has been created.`
          }
        }
      ]
    })
  );

  // Prompt for moving/renaming a file or directory
  server.prompt(
    'webdav_move_remote_item',
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
            text: `Move or rename the file/directory from "${args.fromPath}" to "${args.toPath}" on the remote WebDAV server${args.reason ? ` for the following reason: ${args.reason}` : ''}.

Please execute this remote WebDAV operation and confirm when complete.`
          }
        }
      ]
    })
  );

  // Prompt for copying a file or directory
  server.prompt(
    'webdav_copy_remote_item',
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
            text: `Copy the file or directory from "${args.fromPath}" to "${args.toPath}" on the remote WebDAV server.

Please execute this remote WebDAV copy operation and confirm when complete.`
          }
        }
      ]
    })
  );
}