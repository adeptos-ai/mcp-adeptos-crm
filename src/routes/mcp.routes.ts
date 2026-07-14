import { Router } from 'express';
import { McpController } from '../controllers/mcp.controller.js';
import { McpService } from '../services/mcp.service.js';

const router: Router = Router();
const service = new McpService();
const controller = new McpController(service);

router.post('/', controller.handleMcpRequest.bind(controller));

export default router;
