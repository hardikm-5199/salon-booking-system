import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();
const prisma = new PrismaClient();

// Helper function to generate unique salon codes
function generateSalonCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Register new salon owner
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, salonName } = req.body;
    
    console.log('=== REGISTRATION START ===');
    console.log('Registration attempt:', { email, name, salonName });

    // Check if user exists in OUR database first
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('User already exists in our DB');
      return res.status(400).json({ 
        error: 'User already exists. Please login instead.' 
      });
    }

    let supabaseUserId: string;
    
    // Try to create Supabase user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError && authError.message.includes('already been registered')) {
      console.log('User exists in Supabase, fetching their ID...');
      
      // Get existing user from Supabase
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
        filter: { email }
      });
      
      if (!existingUsers?.users || existingUsers.users.length === 0) {
        return res.status(400).json({ error: 'Failed to find existing user' });
      }
      
      supabaseUserId = existingUsers.users[0].id;
      console.log('Found existing Supabase user:', supabaseUserId);
    } else if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(400).json({ error: authError.message });
    } else {
      supabaseUserId = authData!.user.id;
      console.log('✅ Created new Supabase user:', supabaseUserId);
    }

    // Now create our database records with the Supabase user ID
    try {
      console.log('Creating database user with authId:', supabaseUserId);
      
      const user = await prisma.user.create({
        data: {
          authId: supabaseUserId,
          email,
          name,
          phone: phone || null,
          role: 'SALON_OWNER',
        }
      });
      
      console.log('✅ Database user created:', user.id);
      
      const salon = await prisma.salon.create({
        data: {
          name: salonName,
          email,
          phone: phone || '',
          code: generateSalonCode(),
          ownerId: user.id,
          workingHours: {
            monday: { open: "09:00", close: "18:00" },
            tuesday: { open: "09:00", close: "18:00" },
            wednesday: { open: "09:00", close: "18:00" },
            thursday: { open: "09:00", close: "18:00" },
            friday: { open: "09:00", close: "18:00" },
            saturday: { open: "09:00", close: "18:00" },
            sunday: { open: "10:00", close: "16:00" }
          }
        }
      });
      
      console.log('✅ Salon created:', salon.id, 'with code:', salon.code);
      console.log('=== REGISTRATION SUCCESS ===');

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          salon: salon
        }
      });
    } catch (dbError: any) {
      console.error('❌ Database error:', dbError);
      console.error('Error code:', dbError.code);
      console.error('Error meta:', dbError.meta);
      
      res.status(500).json({ error: 'Failed to create user in database' });
    }
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Sync user after Supabase login
router.post('/sync-user', async (req, res) => {
  try {
    const { authId, email, name } = req.body;

    console.log('=== SYNC USER START ===');
    console.log('Sync request:', { authId, email, name });

    if (!authId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // First try to find by authId
    let user = await prisma.user.findUnique({
      where: { authId },
      include: { ownedSalon: true }
    });

    if (!user) {
      // If not found by authId, try by email
      user = await prisma.user.findUnique({
        where: { email },
        include: { ownedSalon: true }
      });

      if (user) {
        // Update existing user with authId if missing
        console.log('Updating existing user with authId');
        user = await prisma.user.update({
          where: { id: user.id },
          data: { authId },
          include: { ownedSalon: true }
        });
      } else {
        // Create new user (client role by default)
        console.log('Creating new client user');
        user = await prisma.user.create({
          data: {
            authId,
            email,
            name: name || email.split('@')[0],
            role: 'CLIENT'
          },
          include: { ownedSalon: true }
        });
      }
    }

    console.log('✅ User synced:', user.id);
    console.log('=== SYNC USER SUCCESS ===');
    
    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        salon: user.ownedSalon
      }
    });
  } catch (error: any) {
    console.error('❌ Sync user error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !supabaseUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get our user record
    const user = await prisma.user.findUnique({
      where: { authId: supabaseUser.id },
      include: { ownedSalon: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        salon: user.ownedSalon
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;