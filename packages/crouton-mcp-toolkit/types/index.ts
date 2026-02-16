export interface CroutonMcpToolkitConfig {
  /**
   * MCP server name displayed to clients
   * @default 'crouton'
   */
  name?: string

  /**
   * Enable/disable the MCP toolkit
   * @default true in development, false in production
   */
  enabled?: boolean
}
