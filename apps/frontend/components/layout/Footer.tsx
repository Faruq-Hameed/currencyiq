import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <TrendingUp className="h-5 w-5" />
            CurrencyIQ
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/currencies" className="hover:text-gray-700">Currencies</Link>
            <Link href="/docs" className="hover:text-gray-700">API Docs</Link>
            <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} CurrencyIQ. Data for informational use only.</p>
        </div>
      </div>
    </footer>
  );
}
