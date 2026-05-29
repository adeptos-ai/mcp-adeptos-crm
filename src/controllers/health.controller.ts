import { Request, Response } from 'express';

export class HealthController {
  getHealth(_req: Request, res: Response) {
    res.json({
      status: "ok",
      server: "mcp-adeptos-crm",
      timestamp: new Date().toISOString()
    });
  }
}
