import { Router } from 'express';
import { getTeam, updateTeamMemberStatus } from '../controllers/teamController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireRole(['Administrator']), getTeam);
router.patch('/:id/status', requireAuth, requireRole(['Administrator']), updateTeamMemberStatus);

export default router;
