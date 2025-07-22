import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    console.log('Auth middleware - Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify with Supabase using the admin client
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !supabaseUser) {
      console.log('Token verification failed:', error?.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Supabase user verified:', supabaseUser.id);

    // Get our user record
    const user = await prisma.user.findUnique({
      where: { authId: supabaseUser.id },
      include: { ownedSalon: true }
    });

    if (!user) {
      console.log('User not found in database for authId:', supabaseUser.id);
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('User authenticated:', user.email, 'Role:', user.role);

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is salon owner
export const requireSalonOwner = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'SALON_OWNER') {
    console.log('User is not salon owner. Role:', req.user.role);
    return res.status(403).json({ error: 'Salon owner access required' });
  }
  
  next();
};