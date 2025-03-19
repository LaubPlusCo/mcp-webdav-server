import { z } from 'zod';

// Schema for WebDAV configuration
export const WebDAVConfigSchema = z.object({
  rootUrl: z.string().url('Root URL must be a valid URL'),
  rootPath: z.string().default('/'),
  authEnabled: z.boolean().optional().default(false),
  username: z.string().optional(),
  password: z.string().optional()
})
// Add runtime validation logic
.refine(
  (data) => !data.authEnabled || (data.username && data.password), 
  {
    message: "Username and password are required when authentication is enabled",
    path: ["authEnabled"]
  }
);

// Schema for HTTP server auth configuration
export const HttpAuthConfigSchema = z.object({
  enabled: z.boolean().optional().default(false),
  username: z.string().optional(),
  password: z.string().optional(),
  realm: z.string().optional().default('MCP WebDAV Server')
})
// Add runtime validation logic
.refine(
  (data) => !data.enabled || (data.username && data.password),
  {
    message: "Username and password are required when authentication is enabled",
    path: ["enabled"]
  }
);

// Schema for HTTP server configuration
export const HttpServerConfigSchema = z.object({
  port: z.number().int().positive().default(3000),
  auth: HttpAuthConfigSchema.optional().default({})
});

// Schema for main server options
export const ServerOptionsSchema = z.object({
  webdavConfig: WebDAVConfigSchema,
  useHttp: z.boolean().optional().default(false),
  httpConfig: HttpServerConfigSchema.optional()
})
// Add runtime validation logic
.refine(
  (data) => !data.useHttp || data.httpConfig !== undefined,
  {
    message: "HTTP configuration is required when useHttp is true",
    path: ["useHttp"]
  }
);

// Export types based on the schemas
export type ValidatedWebDAVConfig = z.infer<typeof WebDAVConfigSchema>;
export type ValidatedHttpAuthConfig = z.infer<typeof HttpAuthConfigSchema>;
export type ValidatedHttpServerConfig = z.infer<typeof HttpServerConfigSchema>;
export type ValidatedServerOptions = z.infer<typeof ServerOptionsSchema>;

/**
 * Validate server configuration options
 * @param options Server configuration options
 * @returns Validated options or throws error
 */
export function validateConfig(options: any): ValidatedServerOptions {
  try {
    return ServerOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format error message for better readability
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Configuration validation failed:\n${formattedErrors}`);
    }
    throw error;
  }
}
