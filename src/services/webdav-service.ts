import { WebDAVClient } from 'webdav';
import { webdavConnectionPool } from './webdav-connection-pool.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WebDAVService');

// Define our own FileStat interface to match what we use in the application
export interface FileStat {
  filename: string;
  basename: string;
  lastmod?: string;
  size?: number;
  type: 'file' | 'directory';
  mime?: string;
  [key: string]: any;
}

// Define interfaces for response types
interface ResponseData {
  status?: number;
  data?: any;
  [key: string]: any;
}

export interface WebDAVConfig {
  rootUrl: string;
  rootPath: string;
  username?: string;
  password?: string;
  authEnabled?: boolean;
}

export class WebDAVService {
  private client: WebDAVClient;
  private rootPath: string;

  constructor(config: WebDAVConfig) {
    logger.debug('Initializing WebDAV service', { rootUrl: config.rootUrl, rootPath: config.rootPath });
    
    // Determine if auth is enabled
    const authEnabled = Boolean(config.authEnabled) || Boolean(config.username && config.password);
    
    // Get connection options
    const connectionOptions: any = {
      rootUrl: config.rootUrl,
      authEnabled,
      username: config.username,
      password: config.password
    };
    
    // Get connection from pool
    this.client = webdavConnectionPool.getConnection(connectionOptions);
    this.rootPath = config.rootPath;
    
    logger.info('WebDAV service initialized', { 
      rootUrl: config.rootUrl,
      rootPath: config.rootPath,
      authEnabled: authEnabled 
    });
  }

  /**
   * List files and directories at the specified path
   */
  async list(path: string = '/'): Promise<FileStat[]> {
    const fullPath = this.getFullPath(path);
    logger.debug(`Listing directory: ${fullPath}`);
    
    try {
      // In v5.x we need to handle the response differently
      const result = await this.client.getDirectoryContents(fullPath);
      
      // Convert the result to our FileStat interface
      const fileStats = Array.isArray(result) 
        ? result.map(item => this.convertToFileStat(item))
        : this.isResponseData(result) && Array.isArray(result.data)
          ? result.data.map(item => this.convertToFileStat(item))
          : [];
          
      logger.debug(`Listed ${fileStats.length} items in directory: ${fullPath}`);
      return fileStats;
    } catch (error) {
      logger.error(`Error listing directory ${fullPath}:`, error);
      throw new Error(`Failed to list directory: ${(error as Error).message}`);
    }
  }

  /**
   * Get file stats for a specific path
   */
  async stat(path: string): Promise<FileStat> {
    const fullPath = this.getFullPath(path);
    logger.debug(`Getting stats for: ${fullPath}`);
    
    try {
      const result = await this.client.stat(fullPath);
      
      // Convert the result to our FileStat interface
      const stats = this.convertToFileStat(
        this.isResponseData(result) ? result.data : result
      );
      
      logger.debug(`Got stats for: ${fullPath}`, { type: stats.type });
      return stats;
    } catch (error) {
      logger.error(`Error getting stats for ${fullPath}:`, error);
      throw new Error(`Failed to get file stats: ${(error as Error).message}`);
    }
  }

  /**
   * Read file content as text
   */
  async readFile(path: string): Promise<string> {
    const fullPath = this.getFullPath(path);
    logger.debug(`Reading file: ${fullPath}`);
    
    try {
      // v5.x returns buffer by default, need to use format: 'text'
      const content = await this.client.getFileContents(fullPath, { format: 'text' });
      
      // Handle both direct string response and detailed response
      let result: string;
      if (typeof content === 'string') {
        result = content;
      } else if (this.isResponseData(content)) {
        result = String(content.data);
      } else {
        throw new Error("Unexpected response format from server");
      }
      
      const contentLength = result.length;
      logger.debug(`Read file: ${fullPath}`, { contentLength });
      return result;
    } catch (error) {
      logger.error(`Error reading file ${fullPath}:`, error);
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  /**
   * Write content to a file
   */
  async writeFile(path: string, content: string | Buffer): Promise<void> {
    const fullPath = this.getFullPath(path);
    const contentLength = typeof content === 'string' ? content.length : content.length;
    logger.debug(`Writing file: ${fullPath}`, { contentLength });
    
    try {
      // putFileContents in v5.x returns a boolean indicating success
      const result = await this.client.putFileContents(fullPath, content);
      
      // Check result based on type
      if (typeof result === 'boolean' && !result) {
        throw new Error("Failed to write file: server returned failure status");
      } else if (this.isResponseData(result) && 
                 result.status !== undefined && 
                 result.status !== 201 && 
                 result.status !== 204) {
        throw new Error(`Failed to write file: server returned status ${result.status}`);
      }
      
      logger.debug(`Successfully wrote file: ${fullPath}`);
    } catch (error) {
      logger.error(`Error writing to file ${fullPath}:`, error);
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  /**
   * Create a directory
   */
  async createDirectory(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);
    logger.debug(`Creating directory: ${fullPath}`);
    
    try {
      // createDirectory in v5.x returns a boolean indicating success
      const result = await this.client.createDirectory(fullPath);
      
      // Check result based on type
      if (typeof result === 'boolean' && !result) {
        throw new Error("Failed to create directory: server returned failure status");
      } else if (this.isResponseData(result) && 
                 result.status !== undefined && 
                 result.status !== 201 && 
                 result.status !== 204) {
        throw new Error(`Failed to create directory: server returned status ${result.status}`);
      }
      
      logger.debug(`Successfully created directory: ${fullPath}`);
    } catch (error) {
      logger.error(`Error creating directory ${fullPath}:`, error);
      throw new Error(`Failed to create directory: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a file or directory
   */
  async delete(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);
    logger.debug(`Deleting: ${fullPath}`);
    
    try {
      // Get type before deleting for better logging
      const stat = await this.stat(fullPath).catch(() => null);
      const itemType = stat?.type || 'item';
      
      // deleteFile in v5.x returns a boolean indicating success
      const result = await this.client.deleteFile(fullPath);
      
      // Check result based on type
      if (typeof result === 'boolean' && !result) {
        throw new Error("Failed to delete: server returned failure status");
      } else if (this.isResponseData(result) && 
                 result.status !== undefined && 
                 result.status !== 204) {
        throw new Error(`Failed to delete: server returned status ${result.status}`);
      }
      
      logger.debug(`Successfully deleted ${itemType}: ${fullPath}`);
    } catch (error) {
      logger.error(`Error deleting ${fullPath}:`, error);
      throw new Error(`Failed to delete: ${(error as Error).message}`);
    }
  }

  /**
   * Move/rename a file or directory
   */
  async move(fromPath: string, toPath: string): Promise<void> {
    const fullFromPath = this.getFullPath(fromPath);
    const fullToPath = this.getFullPath(toPath);
    logger.debug(`Moving from ${fullFromPath} to ${fullToPath}`);
    
    try {
      // Get type before moving for better logging
      const stat = await this.stat(fromPath).catch(() => null);
      const itemType = stat?.type || 'item';
      
      // moveFile in v5.x returns a boolean indicating success
      const result = await this.client.moveFile(fullFromPath, fullToPath);
      
      // Check result based on type
      if (typeof result === 'boolean' && !result) {
        throw new Error("Failed to move: server returned failure status");
      } else if (this.isResponseData(result) && 
                 result.status !== undefined && 
                 result.status !== 201 && 
                 result.status !== 204) {
        throw new Error(`Failed to move: server returned status ${result.status}`);
      }
      
      logger.debug(`Successfully moved ${itemType} from ${fullFromPath} to ${fullToPath}`);
    } catch (error) {
      logger.error(`Error moving from ${fullFromPath} to ${fullToPath}:`, error);
      throw new Error(`Failed to move: ${(error as Error).message}`);
    }
  }

  /**
   * Copy a file or directory
   */
  async copy(fromPath: string, toPath: string): Promise<void> {
    const fullFromPath = this.getFullPath(fromPath);
    const fullToPath = this.getFullPath(toPath);
    logger.debug(`Copying from ${fullFromPath} to ${fullToPath}`);
    
    try {
      // Get type before copying for better logging
      const stat = await this.stat(fromPath).catch(() => null);
      const itemType = stat?.type || 'item';
      
      // copyFile in v5.x returns a boolean indicating success
      const result = await this.client.copyFile(fullFromPath, fullToPath);
      
      // Check result based on type
      if (typeof result === 'boolean' && !result) {
        throw new Error("Failed to copy: server returned failure status");
      } else if (this.isResponseData(result) && 
                 result.status !== undefined && 
                 result.status !== 201 && 
                 result.status !== 204) {
        throw new Error(`Failed to copy: server returned status ${result.status}`);
      }
      
      logger.debug(`Successfully copied ${itemType} from ${fullFromPath} to ${fullToPath}`);
    } catch (error) {
      logger.error(`Error copying from ${fullFromPath} to ${fullToPath}:`, error);
      throw new Error(`Failed to copy: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(path: string): Promise<boolean> {
    const fullPath = this.getFullPath(path);
    logger.debug(`Checking if exists: ${fullPath}`);
    
    try {
      const result = await this.client.exists(fullPath);
      
      // Handle both boolean and object responses
      let exists = false;
      
      if (typeof result === 'boolean') {
        exists = result;
      } else if (result && typeof result === 'object') {
        // Use type guard for better type safety
        const responseData = result as ResponseData;
        if (responseData.status !== undefined) {
          exists = responseData.status < 400; // If status is less than 400, the resource exists
        }
      }
      
      logger.debug(`Exists check for ${fullPath}: ${exists}`);
      return exists;
    } catch (error) {
      logger.error(`Error checking existence of ${fullPath}:`, error);
      return false;
    }
  }

  /**
   * Type guard to check if an object is a ResponseData
   */
  private isResponseData(value: any): value is ResponseData {
    return value !== null && 
           typeof value === 'object' && 
           'status' in value;
  }

  /**
   * Get the full path by combining root path with the provided path
   */
  private getFullPath(path: string): string {
    // Make sure path starts with / but not with //
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Combine root path with the provided path
    if (this.rootPath === '/') {
      return normalizedPath;
    }
    
    const rootWithoutTrailingSlash = this.rootPath.endsWith('/')
      ? this.rootPath.slice(0, -1)
      : this.rootPath;
      
    return `${rootWithoutTrailingSlash}${normalizedPath}`;
  }

  /**
   * Convert a WebDAV response to our FileStat interface
   */
  private convertToFileStat(item: any): FileStat {
    if (!item) {
      return {
        filename: '',
        basename: '',
        type: 'file'
      };
    }
    
    return {
      filename: item.filename || item.href || '',
      basename: item.basename || this.getBasenameFromPath(item.filename || item.href || ''),
      type: item.type || (item.mime?.includes('directory') ? 'directory' : 'file'),
      size: item.size,
      lastmod: item.lastmod,
      mime: item.mime,
      ...item
    };
  }

  /**
   * Extract basename from a path
   */
  private getBasenameFromPath(path: string): string {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }
}
