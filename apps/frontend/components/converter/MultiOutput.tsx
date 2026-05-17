'use client';
import { useQuery } from '@tanstack/react-query';
import { ratesApi, unwrap } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

const POPULAR = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'NGN'];

interface Conversion { currency: string; result: number | null; rate: number | null }
interface MultiResult { from: string; amount: number; conversions: Conversion[] }

interface Props { from: string; amount: number; exclude: string }

export function MultiOutput({ from, amount, exclude }: Props) {
  const targets = POPULAR.filter((c) => c !== from && c !== exclude).slice(0, 5);
  const toParam = targets.join(',');

  const { data } = useQuery<MultiResult | null>({
    queryKey: ['multi', from, toParam, amount],
    queryFn: async () => {
      const res = await ratesApi.convertMulti(from, toParam, amount);
      return unwrap<MultiResult>(res);
    },
    enabled: targets.length > 0,
    staleTime: 60_000,
  });

  const conversions = data?.conversions || [];
  if (!conversions.length) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="text-xs font-medium text-gray-500 mb-2">Also equals</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {conversions.map(({ currency, result }) => (
          <div key={currency} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
            <span className="font-semibold text-gray-700">
              {result !== null ? formatNumber(result, 2) : '—'}
            </span>
            <span className="ml-1 text-gray-400">{currency}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
