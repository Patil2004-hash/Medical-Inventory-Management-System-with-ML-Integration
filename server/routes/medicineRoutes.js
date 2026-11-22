import { Router } from 'express';
import { getMedicines, adjustStock, getStockAdjustments } from '../controllers/medicineController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getMedicines);
router.post('/stock-adjustment', requireAuth, requireRole(['Administrator', 'Pharmacist']), adjustStock);
router.get('/stock-adjustments', requireAuth, getStockAdjustments);

export default router;
