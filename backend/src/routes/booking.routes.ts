import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { addHours, startOfDay, endOfDay, format, addMinutes } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

// Get salon by code (for clients)
router.get('/salon/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const salon = await prisma.salon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        services: {
          where: { active: true },
          orderBy: { name: 'asc' }
        }
      }
    });
    
    if (!salon) {
      return res.status(404).json({ error: 'Salon not found' });
    }
    
    res.json({ salon });
  } catch (error) {
    console.error('Get salon error:', error);
    res.status(500).json({ error: 'Failed to fetch salon' });
  }
});

// Get available slots for a service on a specific date
router.post('/available-slots', async (req, res) => {
  try {
    const { salonId, serviceId, date } = req.body;
    
    // Get service duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Get salon working hours
    const salon = await prisma.salon.findUnique({
      where: { id: salonId }
    });
    
    if (!salon) {
      return res.status(404).json({ error: 'Salon not found' });
    }
    
    // Get existing bookings for the date
    const startDate = startOfDay(new Date(date));
    const endDate = endOfDay(new Date(date));
    
    const existingBookings = await prisma.booking.findMany({
      where: {
        salonId,
        date: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      include: {
        service: true
      }
    });
    
    // Generate available slots
    const slots = generateAvailableSlots(
      salon.workingHours as any,
      service.duration,
      existingBookings,
      date
    );
    
    res.json({ slots });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// Create a booking
router.post('/book', async (req, res) => {
  try {
    const { salonId, serviceId, date, customerName, customerEmail, customerPhone } = req.body;
    
    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Check if slot is still available
    const bookingDate = new Date(date);
    const endTime = addMinutes(bookingDate, service.duration);
    
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        salonId,
        status: {
          in: ['PENDING', 'CONFIRMED']
        },
        OR: [
          {
            AND: [
              { date: { lte: bookingDate } },
              { date: { gt: new Date(bookingDate.getTime() - service.duration * 60000) } }
            ]
          }
        ]
      }
    });
    
    if (conflictingBooking) {
      return res.status(400).json({ error: 'This slot is no longer available' });
    }
    
    // Create or find customer
    let user = await prisma.user.findUnique({
      where: { email: customerEmail }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          authId: `guest_${Date.now()}`, // Guest users
          role: 'CLIENT'
        }
      });
    }
    
    // Create booking
    const booking = await prisma.booking.create({
      data: {
        date: bookingDate,
        status: 'CONFIRMED',
        totalAmount: service.price,
        clientId: user.id,
        serviceId: service.id,
        salonId
      },
      include: {
        service: true,
        salon: true,
        client: true
      }
    });
    
    res.status(201).json({ booking });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get bookings for salon owner
router.get('/salon-bookings', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.ownedSalon) {
      return res.status(400).json({ error: 'No salon found for user' });
    }
    
    const bookings = await prisma.booking.findMany({
      where: {
        salonId: user.ownedSalon.id
      },
      include: {
        service: true,
        client: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    res.json({ bookings });
  } catch (error) {
    console.error('Get salon bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});
// Update booking status (for salon owner)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;
    
    // Verify the booking belongs to the user's salon
    const booking = await prisma.booking.findFirst({
      where: {
        id,
        salon: {
          ownerId: user.id
        }
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        service: true,
        client: true
      }
    });
    
    res.json({ booking: updatedBooking });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Helper function to generate available slots
function generateAvailableSlots(
  workingHours: any,
  serviceDuration: number,
  existingBookings: any[],
  date: string
): string[] {
  const slots: string[] = [];
  const dayOfWeek = format(new Date(date), 'EEEE').toLowerCase();
  const dayHours = workingHours[dayOfWeek] || { open: '09:00', close: '18:00' };
  
  const [openHour, openMinute] = dayHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
  
  let currentTime = new Date(date);
  currentTime.setHours(openHour, openMinute, 0, 0);
  
  const closeTime = new Date(date);
  closeTime.setHours(closeHour, closeMinute, 0, 0);
  
  while (currentTime < closeTime) {
    const slotEnd = addMinutes(currentTime, serviceDuration);
    
    if (slotEnd <= closeTime) {
      // Check if slot conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = new Date(booking.date);
        const bookingEnd = addMinutes(bookingStart, booking.service.duration);
        
        return (
          (currentTime >= bookingStart && currentTime < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (currentTime <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push(format(currentTime, 'HH:mm'));
      }
    }
    
    currentTime = addMinutes(currentTime, 30); // 30-minute intervals
  }
  
  return slots;
}

export default router;