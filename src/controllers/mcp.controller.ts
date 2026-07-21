import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpService } from '../services/mcp.service.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class McpController {
  constructor(private mcpService: McpService) {}

  async handleMcpRequest(req: Request, res: Response) {
    const rawId = req.headers["x-business-id"];
    const headerBusinessId = parseInt((Array.isArray(rawId) ? rawId[0] : rawId)?.trim() || "0", 10);
    const businessId = headerBusinessId || config.adeptosBusinessId;

    if (!businessId) {
      logger.warn("Missing Business ID in request headers.");
      res.status(400).json({ error: "Missing Business ID." });
      return;
    }

    const rawToken = req.headers["authorization"]?.replace("Bearer ", "");
    const jwtToken = rawToken || config.adeptosJwtToken;

    if (!jwtToken) {
      logger.warn("Missing JWT Token in request headers.");
      res.status(401).json({ error: "Missing JWT Token." });
      return;
    }

    // demos/standard injects Path via agent_id_header (configured as x-agent-id on catalog).
    const rawAgent =
      req.headers["x-agent-id"] ??
      req.headers["x-agent-path"] ??
      req.headers["agent-id"];
    const defaultAgentId = (
      Array.isArray(rawAgent) ? rawAgent[0] : rawAgent || ""
    )
      .toString()
      .trim()
      .replace(/^\/+/, "");

    logger.debug(
      `Incoming MCP connection businessId=${businessId} agentId=${defaultAgentId || "(none)"}`
    );

    const server = this.mcpService.createServer(
      businessId,
      jwtToken,
      defaultAgentId
    );
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    
    res.on("close", () => {
      logger.debug("Client connection closed.");
      transport.close();
      server.close();
    });
    
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
