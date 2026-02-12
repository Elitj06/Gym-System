import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Not authorized to access this route', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = await User.findByPk(decoded.id);

    if (!req.user) {
      throw new AppError('User not found', 404);
    }

    next();
  } catch (error) {
    next(new AppError('Not authorized', 401));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Not authorized for this role', 403));
    }
    next();
  };
};
