'use client';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { TrendingUp } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <TrendingUp className="h-6 w-6" />
            CurrencyIQ
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Converter</Link>
            <Link href="/currencies" className="hover:text-blue-600 transition-colors">Currencies</Link>
            <Link href="/docs" className="hover:text-blue-600 transition-colors">API Docs</Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600">Dashboard</Link>
                <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600">Login</Link>
                <Link href="/register" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Get API Key
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
