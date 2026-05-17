'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { currenciesApi, unwrap } from '@/lib/api';
import { CurrencyCard } from '@/components/currency/CurrencyCard';
import { Search } from 'lucide-react';

interface Currency { code: string; name: string; symbol?: string; flag_url?: string }

export default function CurrenciesPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<Currency[]>({
    queryKey: ['currencies', search],
    queryFn: () => currenciesApi.list(search || undefined).then((r) => unwrap<Currency[]>(r) || []),
    staleTime: 300_000,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Currency Explorer</h1>
        <p className="text-gray-500">Browse 160+ world currencies with flags, metadata, and live rates.</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(data || []).map((c) => (
            <CurrencyCard key={c.code} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}
