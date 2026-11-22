import { Router } from 'express';
import { getPurchases, createPurchase, receivePurchase } from '../controllers/purchaseController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getPurchases);
router.post('/', requireAuth, requireRole(['Administrator', 'Pharmacist']), createPurchase);
router.patch('/:id/receive', requireAuth, requireRole(['Administrator', 'Pharmacist']), receivePurchase);

export default router;
