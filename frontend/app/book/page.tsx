'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, Phone, Mail } from 'lucide-react';

type Salon = {
  id: string;
  name: string;
  code: string;
  services: Service[];
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
};

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [salonCode, setSalonCode] = useState('');
  const [salon, setSalon] = useState<Salon | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  // Step 1: Find salon by code
  const handleFindSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/salon/${salonCode}`);
      
      if (response.ok) {
        const data = await response.json();
        setSalon(data.salon);
        setStep(2);
      } else {
        alert('Salon not found. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Find salon error:', error);
      alert('Failed to find salon');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Select service and date
  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setSelectedSlot('');
    
    if (selectedService) {
      await fetchAvailableSlots(date);
    }
  };

  const fetchAvailableSlots = async (date: string) => {
    if (!salon || !selectedService) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/available-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon.id,
          serviceId: selectedService.id,
          date
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots);
      }
    } catch (error) {
      console.error('Fetch slots error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Book appointment
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !selectedService || !selectedDate || !selectedSlot) return;
    
    setLoading(true);
    try {
      const bookingDate = new Date(`${selectedDate}T${selectedSlot}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon.id,
          serviceId: selectedService.id,
          date: bookingDate.toISOString(),
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Booking confirmed! Your appointment is on ${format(bookingDate, 'PPP')} at ${selectedSlot}`);
        // Reset form
        setStep(1);
        setSalonCode('');
        setSalon(null);
        setSelectedService(null);
        setSelectedDate('');
        setSelectedSlot('');
        setCustomerInfo({ name: '', email: '', phone: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Book an Appointment</h1>
        
        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          <div className={`flex-1 text-center ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <p className="mt-2 text-sm">Find Salon</p>
          </div>
          <div className={`flex-1 text-center ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <p className="mt-2 text-sm">Select Service</p>
          </div>
          <div className={`flex-1 text-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <p className="mt-2 text-sm">Book Slot</p>
          </div>
        </div>

        {/* Step 1: Enter Salon Code */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Enter Salon Code</h2>
            <form onSubmit={handleFindSalon}>
              <input
                type="text"
                required
                placeholder="Enter 6-digit salon code"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
                value={salonCode}
                onChange={(e) => setSalonCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                type="submit"
                disabled={loading || salonCode.length !== 6}
                className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Finding...' : 'Find Salon'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Select Service and Date */}
        {step === 2 && salon && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{salon.name}</h2>
            
            <div className="mb-6">
              <h3 className="font-medium mb-3">Select a Service</h3>
              <div className="grid gap-3">
                {salon.services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      selectedService?.id === service.id 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{service.price}</p>
                        <p className="text-sm text-gray-500">{service.duration} mins</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedService && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">Select Date</h3>
                <input
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>
            )}

            {selectedDate && availableSlots.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">Available Time Slots</h3>
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-3 rounded-lg text-sm ${
                        selectedSlot === slot
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && availableSlots.length === 0 && !loading && (
              <p className="text-gray-500 text-center py-4">No available slots for this date</p>
            )}

            <button
              onClick={() => setStep(3)}
              disabled={!selectedService || !selectedDate || !selectedSlot}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Continue to Booking
            </button>
          </div>
        )}

        {/* Step 3: Customer Information */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Booking Summary</p>
              <p className="font-medium">{selectedService?.name} at {salon?.name}</p>
              <p className="text-sm">{selectedDate && format(new Date(selectedDate), 'PPP')} at {selectedSlot}</p>
              <p className="font-semibold">₹{selectedService?.price}</p>
            </div>

            <form onSubmit={handleBooking}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="inline h-4 w-4 mr-1" />
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}