import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, async (req, res) => {
  res.json({ message: 'Get all gyms' });
});

export default router;
