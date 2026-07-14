import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';

const router: Router = Router();
const controller = new HealthController();

router.get('/', controller.getHealth.bind(controller));

export default router;
