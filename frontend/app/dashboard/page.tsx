'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard!
              </h1>
              
              <div className="mb-6">
                <p className="text-gray-600">
                  Logged in as: <span className="font-medium">{user.email}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900">Today's Bookings</h3>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                  <p className="text-sm text-blue-700">No bookings yet</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900">Services</h3>
                  <p className="text-2xl font-bold text-green-600">0</p>
                  <p className="text-sm text-green-700">Add your first service</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-900">Total Revenue</h3>
                  <p className="text-2xl font-bold text-purple-600">₹0</p>
                  <p className="text-sm text-purple-700">This month</p>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/dashboard/services" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                  <h3 className="text-lg font-medium text-gray-900">Manage Services</h3>
                  <p className="mt-2 text-sm text-gray-600">Add and edit your salon services</p>
                </Link>
                
                <Link href="/dashboard/bookings" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                  <h3 className="text-lg font-medium text-gray-900">View Bookings</h3>
                  <p className="mt-2 text-sm text-gray-600">See all upcoming appointments</p>
                </Link>
                
                <Link href="/dashboard/profile" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                  <h3 className="text-lg font-medium text-gray-900">Salon Profile</h3>
                  <p className="mt-2 text-sm text-gray-600">Update your salon information</p>
                </Link>
              </div>

              <div className="mt-6">
                <button
                  onClick={signOut}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}