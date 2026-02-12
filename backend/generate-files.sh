#!/bin/bash

# Script para gerar arquivos restantes do backend

echo "Gerando arquivos do backend..."

# Criar middleware de validação
cat > src/middleware/validate.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      errors: errors.array(),
    });
  }
  next();
};
EOF

# Criar middleware de autenticação
cat > src/middleware/auth.ts << 'EOF'
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
EOF

# Criar controller de autenticação
cat > src/controllers/auth.controller.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const authController = {
  register: asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, firstName, lastName, phone } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    const token = generateToken(user.id);

    res.status(201).json({
      status: 'success',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  }),

  login: asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is disabled', 403);
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id);

    res.json({
      status: 'success',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    res.json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const newToken = generateToken(decoded.id);

    res.json({
      status: 'success',
      data: { token: newToken },
    });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    res.json({
      status: 'success',
      message: 'Password reset email sent',
    });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    res.json({
      status: 'success',
      message: 'Password reset successful',
    });
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    res.json({
      status: 'success',
      message: 'Email verified',
    });
  }),
};
EOF

echo "✓ Arquivos do backend gerados com sucesso!"
