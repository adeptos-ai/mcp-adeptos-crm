import { Router } from 'express';
import healthRoutes from './health.routes.js';
import mcpRoutes from './mcp.routes.js';
import swaggerRoutes from './swagger.routes.js';

const router: Router = Router();

router.use('/health', healthRoutes);
router.use('/mcp', mcpRoutes);
router.use('/api-docs', swaggerRoutes);

export default router;
