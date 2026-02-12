import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/dashboard', protect, async (req, res) => {
  res.json({ message: 'Dashboard analytics' });
});

router.get('/heatmap', protect, async (req, res) => {
  res.json({ message: 'Heatmap data' });
});

export default router;
