import { Router } from 'express';
import { getSales, createSale } from '../controllers/salesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getSales);
router.post('/', requireAuth, createSale);

export default router;
