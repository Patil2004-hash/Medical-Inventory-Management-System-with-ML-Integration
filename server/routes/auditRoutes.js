import { Router } from 'express';
import { getAuditEvents } from '../controllers/auditController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/audit-events', requireAuth, requireRole(['Administrator', 'Pharmacist']), getAuditEvents);

export default router;
