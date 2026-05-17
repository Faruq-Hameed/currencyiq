import Link from 'next/link';
import { upgradeFlagSize } from '@/lib/flags';

interface Currency { code: string; name: string; symbol?: string; flag_url?: string }

export function CurrencyCard({ code, name, symbol, flag_url }: Currency) {
  const flagSrc = upgradeFlagSize(flag_url, 80);
  return (
    <Link
      href={`/currencies/${code}`}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition group"
    >
      <div className="flex items-center gap-3 mb-2">
        {flagSrc ? (
          <img src={flagSrc} alt={code} className="h-8 w-12 object-cover rounded" />
        ) : (
          <div className="h-8 w-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">{code[0]}</div>
        )}
        <div>
          <div className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition">{code}</div>
          {symbol && <div className="text-xs text-gray-400">{symbol}</div>}
        </div>
      </div>
      <div className="text-xs text-gray-500 truncate">{name}</div>
    </Link>
  );
}
