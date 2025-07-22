import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireSalonOwner } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all services for a salon
router.get('/salon/:salonId', async (req, res) => {
  try {
    const { salonId } = req.params;
    
    const services = await prisma.service.findMany({
      where: { 
        salonId,
        active: true 
      },
      orderBy: { name: 'asc' }
    });
    
    res.json({ services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get services for the logged-in salon owner
router.get('/my-services', authenticate, requireSalonOwner, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.ownedSalon) {
      return res.status(400).json({ error: 'No salon found for this user' });
    }
    
    const services = await prisma.service.findMany({
      where: { salonId: user.ownedSalon.id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ services });
  } catch (error) {
    console.error('Get my services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create a new service
router.post('/', authenticate, requireSalonOwner, async (req, res) => {
  try {
    const { name, description, price, duration } = req.body;
    const user = req.user;
    
    if (!user.ownedSalon) {
      return res.status(400).json({ error: 'No salon found for this user' });
    }
    
    const service = await prisma.service.create({
      data: {
        name,
        description,
        price,
        duration,
        salonId: user.ownedSalon.id
      }
    });
    
    res.status(201).json({ service });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update a service
router.put('/:id', authenticate, requireSalonOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, active } = req.body;
    const user = req.user;
    
    // Verify the service belongs to the user's salon
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        salonId: user.ownedSalon?.id
      }
    });
    
    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const service = await prisma.service.update({
      where: { id },
      data: {
        name,
        description,
        price,
        duration,
        active
      }
    });
    
    res.json({ service });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete a service (soft delete)
router.delete('/:id', authenticate, requireSalonOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    // Verify the service belongs to the user's salon
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        salonId: user.ownedSalon?.id
      }
    });
    
    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Soft delete by setting active to false
    await prisma.service.update({
      where: { id },
      data: { active: false }
    });
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

export default router;