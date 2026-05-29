import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolProvider {
  /**
   * Get all tool definitions provided by this implementation
   */
  getTools(): Tool[];

  /**
   * Execute a specific tool with the given parameters
   * @param toolName The name of the tool to execute
   * @param params The parsed arguments for the tool
   * @returns The result of the tool execution
   */
  executeTool(toolName: string, params: Record<string, unknown>): Promise<any>;
}
