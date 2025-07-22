import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-4">
            Salon Booking System
          </h1>
          <p className="text-xl mb-8">
            Manage your salon appointments with ease
          </p>
          
          <div className="space-x-4">
            <Link
              href="/auth/login"
              className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Salon Owner Login
            </Link>
            <Link
              href="/book"
              className="inline-block bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 transition"
            >
              Book Appointment
            </Link>
          </div>
          
          <div className="mt-8">
            <Link
              href="/auth/register"
              className="text-white underline hover:no-underline"
            >
              Register your salon
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}