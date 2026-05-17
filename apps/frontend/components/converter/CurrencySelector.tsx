'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { currenciesApi, unwrap } from '@/lib/api';
import { upgradeFlagSize } from '@/lib/flags';
import { Search, ChevronDown } from 'lucide-react';

interface Currency { code: string; name: string; symbol: string; flag_url?: string }
interface Props { value: string; onChange: (code: string) => void; label?: string }

export function CurrencySelector({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => currenciesApi.list().then((r) => unwrap<Currency[]>(r) || []),
    staleTime: 86_400_000,
  });

  const currencies = data || [];
  const filtered = search
    ? currencies.filter((c) => c.code.includes(search.toUpperCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
    : currencies;

  const selected = currencies.find((c) => c.code === value);

  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      >
        <span className="flex items-center gap-2">
          {selected?.flag_url && (
            <img src={upgradeFlagSize(selected.flag_url, 40)!} alt={selected.code} className="h-4 w-6 object-cover rounded" />
          )}
          <span>{value || 'Select'}</span>
          {selected && <span className="text-gray-400 text-xs">{selected.name}</span>}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="Search currencies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.slice(0, 100).map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 transition ${c.code === value ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                {c.flag_url && <img src={upgradeFlagSize(c.flag_url, 40)!} alt={c.code} className="h-4 w-6 object-cover rounded" />}
                <span className="font-medium w-12">{c.code}</span>
                <span className="text-gray-500 truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
