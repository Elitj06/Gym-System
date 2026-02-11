import { Router } from 'express';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, async (req, res) => {
  res.json({ message: 'Pose routes' });
});

export default router;
