import { Router } from 'express';
import {
  getCustomers,
  createCustomer,
  editCustomer,
  removeCustomer
} from '../controllers/customerController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getCustomers);
router.post('/', requireAuth, createCustomer);
router.patch('/:id', requireAuth, editCustomer);
router.delete('/:id', requireAuth, removeCustomer);

export default router;