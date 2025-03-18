# WebDAV MCP Server

A Model Context Protocol (MCP) server that enables CRUD operations on a WebDAV endpoint with basic authentication. This server enables Claude Desktop and other MCP clients to interact with WebDAV file systems through natural language commands.

## Features

- Connect to any WebDAV server with basic authentication
- Perform CRUD operations on files and directories
- Expose file operations as MCP resources and tools
- Run via stdio transport (for Claude Desktop integration) or HTTP/SSE transport
- Secure access with basic authentication
- Support for encrypted passwords using bcrypt

## Prerequisites

- Node.js 18 or later
- npm or yarn
- WebDAV server (for actual file operations)

## Installation

### Option 1: Install from npm package

```bash
# Global installation
npm install -g webdav-mcp-server

# Or with npx
npx webdav-mcp-server
```

### Option 2: Clone and build from source

```bash
# Clone repository
git clone https://github.com/yourusername/webdav-mcp-server.git
cd webdav-mcp-server

# Install dependencies
npm install

# Build the application
npm run build
```

### Option 3: Docker

```bash
# Build the Docker image
docker build -t webdav-mcp-server .

# Run the container
docker run -p 3000:3000 \
  -e WEBDAV_ROOT_URL=http://your-webdav-server \
  -e WEBDAV_ROOT_PATH=/webdav \
  -e WEBDAV_USERNAME=admin \
  -e WEBDAV_PASSWORD=password \
  -e AUTH_USERNAME=user \
  -e AUTH_PASSWORD=pass \
  webdav-mcp-server
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# WebDAV configuration
WEBDAV_ROOT_URL=http://localhost:4080
WEBDAV_ROOT_PATH=/webdav
WEBDAV_USERNAME=admin

# Password can be plain text
WEBDAV_PASSWORD=password

# Or a bcrypt hash with the {bcrypt} prefix
# WEBDAV_PASSWORD={bcrypt}$2y$10$CyLKnUwn9fqqKQFEbxpZFuE9mzWR/x8t6TE7.CgAN0oT8I/5jKJBy

# Server configuration (for HTTP mode)
SERVER_PORT=3000

# Authentication configuration (for HTTP mode)
AUTH_USERNAME=user
AUTH_PASSWORD=pass
```

### Encrypted Passwords

For enhanced security, you can use bcrypt-encrypted passwords instead of storing them in plain text:

1. Generate a bcrypt hash:
   ```bash
   # Using the built-in utility
   npm run generate-hash -- yourpassword
   
   # Or with npx
   npx webdav-mcp-generate-hash yourpassword
   ```

2. Add the hash to your .env file with the {bcrypt} prefix:
   ```
   WEBDAV_PASSWORD={bcrypt}$2y$10$CyLKnUwn9fqqKQFEbxpZFuE9mzWR/x8t6TE7.CgAN0oT8I/5jKJBy
   ```

This way, your WebDAV password is never stored in plain text.

## Usage

### Running with stdio transport (for Claude Desktop)

This mode is ideal for direct integration with Claude Desktop.

```bash
# If installed globally
webdav-mcp-server

# If using npx
npx webdav-mcp-server

# If built from source
node dist/index.js
```

### Running with HTTP/SSE transport

This mode enables the server to be accessed over HTTP with Server-Sent Events for real-time communication.

```bash
# If installed globally
webdav-mcp-server --http

# If using npx
npx webdav-mcp-server --http

# If built from source
node dist/index.js --http
```

## Quick Start with Docker Compose

The easiest way to get started with both the WebDAV server and the MCP server is to use Docker Compose:

```bash
# Start both WebDAV and MCP servers
docker-compose up

# This will start:
# - WebDAV server on port 4080 (username: admin, password: password)
# - MCP server on port 3000 (username: user, password: pass)
```

## Testing

To run the tests:

```bash
npm test
```

## Integrating with Claude Desktop

1. Ensure the MCP feature is enabled in Claude Desktop
2. Open Claude Desktop settings
3. Navigate to MCP servers section
4. Add a new server:
   - If using stdio transport:
     - Type: Command
     - Command: `npx webdav-mcp-server`
     - (or path to the executable if installed globally or built from source)
   - If using HTTP/SSE transport:
     - Type: HTTP
     - URL: `http://localhost:3000/sse`
     - Authentication: Basic
     - Username: (value of AUTH_USERNAME)
     - Password: (value of AUTH_PASSWORD)
5. Save and enable the server
6. You can now interact with your WebDAV files through Claude

## Available MCP Resources

- `webdav://{path}/list` - List files in a directory
- `webdav://{path}/content` - Get file content
- `webdav://{path}/info` - Get file or directory information

## Available MCP Tools

- `create-file` - Create a new file
- `read-file` - Read file content
- `update-file` - Update existing file
- `delete` - Delete file or directory
- `create-directory` - Create a new directory
- `move` - Move or rename file/directory
- `copy` - Copy file/directory
- `list-directory` - List directory contents

## Available MCP Prompts

- `create-file` - Prompt to create a new file
- `read-file` - Prompt to read a file
- `update-file` - Prompt to update a file
- `delete` - Prompt to delete a file/directory
- `list-directory` - Prompt to list directory contents
- `create-directory` - Prompt to create a directory
- `move` - Prompt to move/rename a file/directory
- `copy` - Prompt to copy a file/directory

## Example Queries in Claude

Here are some example queries you can use in Claude Desktop once the WebDAV MCP server is connected:

- "List files in my WebDAV root directory"
- "Create a new text file called notes.txt with the following content: Hello World"
- "Read the file called document.txt from my WebDAV server"
- "Update my config.json file with this new configuration"
- "Create a directory called projects in my WebDAV"
- "Copy my report.docx file to a backup location"
- "Rename the file old_name.txt to new_name.txt"
- "Delete the file temp.txt"

## Programmatic Usage

You can also use this package programmatically in your own projects:

```javascript
import { startWebDAVServer } from 'webdav-mcp-server';

// For stdio transport with plain password
await startWebDAVServer({
  webdavConfig: {
    rootUrl: 'http://your-webdav-server',
    rootPath: '/webdav',
    username: 'admin',
    password: 'password'
  },
  useHttp: false
});

// With bcrypt hash
await startWebDAVServer({
  webdavConfig: {
    rootUrl: 'http://your-webdav-server',
    rootPath: '/webdav',
    username: 'admin',
    password: '{bcrypt}$2y$10$CyLKnUwn9fqqKQFEbxpZFuE9mzWR/x8t6TE7.CgAN0oT8I/5jKJBy'
  },
  useHttp: false
});

// For HTTP transport
await startWebDAVServer({
  webdavConfig: {
    rootUrl: 'http://your-webdav-server',
    rootPath: '/webdav',
    username: 'admin',
    password: 'password'
  },
  useHttp: true,
  httpConfig: {
    port: 3000,
    authUsername: 'user',
    authPassword: 'pass'
  }
});
```

## Troubleshooting

If you encounter any issues:

1. Check the logs for detailed error messages
2. Verify your WebDAV server is running and accessible
3. Ensure your credentials are correct in the .env file
4. Run the verification script: `verify-build.bat`

## License

MIT
