[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/laubplusco-mcp-webdav-server-badge.png)](https://mseep.ai/app/laubplusco-mcp-webdav-server)

# WebDAV MCP Server

A Model Context Protocol (MCP) server that enables CRUD operations on a WebDAV endpoint with basic authentication. This server enables Claude Desktop and other MCP clients to interact with WebDAV file systems through natural language commands.

## Features

- Connect to any WebDAV server with optional authentication
- Perform CRUD operations on files and directories
- Expose file operations as MCP resources and tools
- Run via stdio transport (for Claude Desktop integration) or HTTP/SSE transport
- Secure access with optional basic authentication
- Support for bcrypt-encrypted passwords for MCP server authentication (WebDAV passwords must be plain text due to protocol limitations)
- Connection pooling for better performance with WebDAV servers
- Configuration validation using Zod
- Structured logging for better troubleshooting

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

# Run the container without authentication
docker run -p 3000:3000 \
  -e WEBDAV_ROOT_URL=http://your-webdav-server \
  -e WEBDAV_ROOT_PATH=/webdav \
  webdav-mcp-server
  
# Run the container with authentication for both WebDAV and MCP server
docker run -p 3000:3000 \
  -e WEBDAV_ROOT_URL=http://your-webdav-server \
  -e WEBDAV_ROOT_PATH=/webdav \
  -e WEBDAV_AUTH_ENABLED=true \
  -e WEBDAV_USERNAME=admin \
  -e WEBDAV_PASSWORD=password \
  -e AUTH_ENABLED=true \
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

# WebDAV authentication (optional)
WEBDAV_AUTH_ENABLED=true
WEBDAV_USERNAME=admin

# WebDAV password must be plain text (required when auth enabled)
# The WebDAV protocol requires sending the actual password to the server
WEBDAV_PASSWORD=password

# Server configuration (for HTTP mode)
SERVER_PORT=3000

# Authentication configuration for MCP server (optional)
AUTH_ENABLED=true
AUTH_USERNAME=user
AUTH_PASSWORD=pass
AUTH_REALM=MCP WebDAV Server

# Auth password for MCP server can be a bcrypt hash (unlike WebDAV passwords)
# AUTH_PASSWORD={bcrypt}$2y$10$CyLKnUwn9fqqKQFEbxpZFuE9mzWR/x8t6TE7.CgAN0oT8I/5jKJBy
```

### Encrypted Passwords for MCP Server Authentication

For enhanced security of the MCP server (not WebDAV connections), you can use bcrypt-encrypted passwords instead of storing them in plain text:

1. Generate a bcrypt hash:
   ```bash
   # Using the built-in utility
   npm run generate-hash -- yourpassword
   
   # Or with npx
   npx webdav-mcp-generate-hash yourpassword
   ```

2. Add the hash to your .env file with the {bcrypt} prefix:
   ```
   AUTH_PASSWORD={bcrypt}$2y$10$CyLKnUwn9fqqKQFEbxpZFuE9mzWR/x8t6TE7.CgAN0oT8I/5jKJBy
   ```

This way, your MCP server password is stored securely. Note that WebDAV passwords must always be in plain text due to protocol requirements.

## Usage

### Running with stdio transport

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
cd docker
docker-compose up -d

# This will start:
# - hacdias/webdav server on port 4080 (username: admin, password: admin)
# - MCP server on port 3000 (username: user, password: pass)
```

This setup uses [hacdias/webdav](https://github.com/hacdias/webdav), a simple and standalone WebDAV server written in Go. The configuration for the WebDAV server is stored in `webdav_config.yml`, which you can modify to adjust permissions, add users, or change other settings.

The WebDAV server stores all files in a Docker volume called `webdav_data`, which persists across container restarts.

## WebDAV Server Configuration

The `webdav_config.yml` file configures the hacdias/webdav server used in the Docker Compose setup. Here's what you can customize:

```yaml
# Server address and port
address: 0.0.0.0
port: 6060

# Root data directory
directory: /data

# Enable/disable CORS
cors:
  enabled: true
  # Additional CORS settings...

# Default permissions (C=Create, R=Read, U=Update, D=Delete)
permissions: CRUD

# User definitions
users:
  - username: admin
    password: admin      # Plain text password
    permissions: CRUD    # Full permissions
  
  - username: reader
    password: reader
    permissions: R       # Read-only permissions
    
  # You can also use bcrypt-encrypted passwords
  - username: secure
    password: "{bcrypt}$2y$10$zEP6oofmXFeHaeMfBNLnP.DO8m.H.Mwhd24/TOX2MWLxAExXi4qgi"
```

For more advanced configuration options, refer to the [hacdias/webdav documentation](https://github.com/hacdias/webdav).

## Testing

To run the tests:

```bash
npm test
```

## Integrating with Claude Desktop

1. Ensure the MCP feature is enabled in Claude Desktop

<details>
<summary>Using npx</summary>
2. Open Claude Desktop settings and click edit config (`claude_desktop_config.json`)
3. Add
```json
{
    "mcpServers": {
        "webdav": {
            "command": "npx",
            "args": [
                "-y",
                "webdav-mcp-server"
            ],
            "env": {
                "WEBDAV_ROOT_URL": "<WEBDAV_ROOT_URL>",
                "WEBDAV_ROOT_PATH": "<WEBDAV_ROOT_PATH>",
                "WEBDAV_USERNAME": "<WEBDAV_USERNAME>",
                "WEBDAV_PASSWORD": "<WEBDAV_PASSWORD>",
                "WEBDAV_AUTH_ENABLED": "true|false"
            }
        }
    }
}
```
</details>
<details>
<summary>Using node and local build</summary>
2. Clone this repository and run `setup.sh` on mac/linux or `setup.bat` on windows
3. Open Claude Desktop settings and click edit config (`claude_desktop_config.json`)
4. Add
```json
{
    "mcpServers": {
        "webdav": {
            "command": "node",
            "args": [
                "<path to repository>/dist/index.js"
            ],
            "env": {
                "WEBDAV_ROOT_URL": "<WEBDAV_ROOT_URL>",
                "WEBDAV_ROOT_PATH": "<WEBDAV_ROOT_PATH>",
                "WEBDAV_USERNAME": "<WEBDAV_USERNAME>",
                "WEBDAV_PASSWORD": "<WEBDAV_PASSWORD>",
                "WEBDAV_AUTH_ENABLED": "true|false"
            }
        }
    }
}
```
</details>

## Available MCP Resources

- `webdav://{path}/list` - List files in a directory
- `webdav://{path}/content` - Get file content
- `webdav://{path}/info` - Get file or directory information

## Available MCP Tools

- `webdav_create_remote_file` - Create a new file on a remote WebDAV server
- `webdav_get_remote_file` - Retrieve content from a file stored on a remote WebDAV server
- `webdav_update_remote_file` - Update an existing file on a remote WebDAV server
- `webdav_delete_remote_item` - Delete a file or directory from a remote WebDAV server
- `webdav_create_remote_directory` - Create a new directory on a remote WebDAV server
- `webdav_move_remote_item` - Move or rename a file/directory on a remote WebDAV server
- `webdav_copy_remote_item` - Copy a file/directory to a new location on a remote WebDAV server
- `webdav_list_remote_directory` - List files and directories on a remote WebDAV server

## Available MCP Prompts

- `webdav_create_remote_file` - Prompt to create a new file on a remote WebDAV server
- `webdav_get_remote_file` - Prompt to retrieve content from a remote WebDAV file
- `webdav_update_remote_file` - Prompt to update a file on a remote WebDAV server
- `webdav_delete_remote_item` - Prompt to delete a file/directory from a remote WebDAV server
- `webdav_list_remote_directory` - Prompt to list directory contents on a remote WebDAV server
- `webdav_create_remote_directory` - Prompt to create a directory on a remote WebDAV server
- `webdav_move_remote_item` - Prompt to move/rename a file/directory on a remote WebDAV server
- `webdav_copy_remote_item` - Prompt to copy a file/directory on a remote WebDAV server

## Example Queries in Claude

Here are some example queries you can use in Claude Desktop once the WebDAV MCP server is connected:

- "List files on my remote WebDAV server"
- "Create a new text file called notes.txt on my remote WebDAV server with the following content: Hello World"
- "Get the content of document.txt from my remote WebDAV server"
- "Update config.json on my remote WebDAV server with this new configuration"
- "Create a directory called projects on my remote WebDAV server"
- "Copy report.docx to a backup location on my remote WebDAV server"
- "Move the file old_name.txt to new_name.txt on my remote WebDAV server"
- "Delete temp.txt from my remote WebDAV server"

## Programmatic Usage

You can also use this package programmatically in your own projects:

```javascript
import { startWebDAVServer } from 'webdav-mcp-server';

// For stdio transport without authentication
await startWebDAVServer({
  webdavConfig: {
    rootUrl: 'http://your-webdav-server',
    rootPath: '/webdav',
    authEnabled: false
  },
  useHttp: false
});

// For stdio transport with WebDAV authentication (password must be plain text)
await startWebDAVServer({
  webdavConfig: {
    rootUrl: 'http://your-webdav-server',
    rootPath: '/webdav',
    authEnabled: true,
    username: 'admin',
    password: 'password'
  },
  useHttp: false
});

// With bcrypt hash for MCP server password (HTTP auth only)
await startWebDAVServer({
  webdavConfig: {
    rootUrl: 'http://your-webdav-server',
    rootPath: '/webdav',
    authEnabled: true,
    username: 'admin',
    password: 'password' // WebDAV password must be plain text
  },
  useHttp: true,
  httpConfig: {
    port: 3000,
    auth: {
      enabled: true,
      username: 'user',
      password: '{bcrypt}$2y$10$CyLKnUwn9fqqKQFEbxpZFuE9mzWR/x8t6TE7.CgAN0oT8I/5jKJBy'
    }
  }
});

// For HTTP transport with MCP authentication
await startWebDAVServer({
  webdavConfig: {
    rootUrl: 'http://your-webdav-server',
    rootPath: '/webdav',
    authEnabled: true,
    username: 'admin',
    password: 'password'
  },
  useHttp: true,
  httpConfig: {
    port: 3000,
    auth: {
      enabled: true,
      username: 'user',
      password: 'pass',
      realm: 'MCP WebDAV Server'
    }
  }
});

// For HTTP transport without authentication
await startWebDAVServer({
  webdavConfig: {
    rootUrl: 'http://your-webdav-server',
    rootPath: '/webdav',
    authEnabled: false
  },
  useHttp: true,
  httpConfig: {
    port: 3000,
    auth: {
      enabled: false
    }
  }
});
```

## License

MIT
