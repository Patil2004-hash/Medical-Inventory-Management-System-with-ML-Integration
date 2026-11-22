import { Router } from 'express';
import { getDashboard, getReportsSummary } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', requireAuth, getDashboard);
router.get('/reports/summary', requireAuth, getReportsSummary);

export default router;
