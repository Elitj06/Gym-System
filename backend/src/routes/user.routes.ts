import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/', protect, authorize('admin'), async (req, res) => {
  res.json({ message: 'Get all users' });
});

router.get('/:id', protect, async (req, res) => {
  res.json({ message: 'Get user by ID' });
});

export default router;
