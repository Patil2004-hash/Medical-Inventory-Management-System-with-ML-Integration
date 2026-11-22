import { Router } from 'express';
import {
  getDemandForecast,
  getExpiryForecast,
  getIntelligenceHealth,
} from '../controllers/intelligenceController.js';
import { askOperationsAssistant } from '../controllers/assistantController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/forecast/demand', requireAuth, getDemandForecast);
router.get('/forecast/expiry', requireAuth, getExpiryForecast);
router.get('/intelligence/health', requireAuth, getIntelligenceHealth);
router.post('/assistant', requireAuth, askOperationsAssistant);

export default router;
