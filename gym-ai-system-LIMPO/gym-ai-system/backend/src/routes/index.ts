import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import poseRoutes from './pose.routes';
import gymRoutes from './gym.routes';
import analyticsRoutes from './analytics.routes';
import alertRoutes from './alert.routes';

const router = Router();

// API versioning
const API_VERSION = '/v1';

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/poses`, poseRoutes);
router.use(`${API_VERSION}/gyms`, gymRoutes);
router.use(`${API_VERSION}/analytics`, analyticsRoutes);
router.use(`${API_VERSION}/alerts`, alertRoutes);

export default router;
