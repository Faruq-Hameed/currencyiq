'use client';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ratesApi, unwrap } from '@/lib/api';
import { CurrencySelector } from './CurrencySelector';
import { MultiOutput } from './MultiOutput';
import { ForceRefreshButton } from './ForceRefreshButton';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface ConvertResult {
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
  meta?: { cached?: boolean; stale?: boolean; source?: string; fetched_at?: string };
}

export function ConverterWidget() {
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('NGN');
  const [amount, setAmount] = useState('1');

  const parsedAmount = Math.max(0, parseFloat(amount) || 0);

  const { data: result, isLoading, refetch } = useQuery<ConvertResult | null>({
    queryKey: ['convert', from, to, parsedAmount],
    queryFn: async () => {
      const res = await ratesApi.convert(from, to, parsedAmount || 1);
      return unwrap<ConvertResult>(res);
    },
    enabled: !!from && !!to && parsedAmount >= 0,
    staleTime: 60_000,
  });

  const swap = useCallback(() => { setFrom(to); setTo(from); }, [from, to]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 w-full max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Currency Converter</h2>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end mb-4">
        <CurrencySelector value={from} onChange={setFrom} label="From" />
        <button
          onClick={swap}
          className="mb-0.5 p-2 rounded-lg border border-gray-300 hover:bg-blue-50 hover:border-blue-400 transition"
          aria-label="Swap currencies"
        >
          <ArrowLeftRight className="h-4 w-4 text-gray-500" />
        </button>
        <CurrencySelector value={to} onChange={setTo} label="To" />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter amount"
        />
      </div>

      <div className="bg-blue-50 rounded-xl p-4 mb-4 min-h-[72px]">
        {isLoading ? (
          <div className="flex items-center text-gray-400 text-sm h-10">Fetching rate...</div>
        ) : result ? (
          <div>
            <div className="flex items-center gap-3 text-2xl font-bold text-gray-800 flex-wrap">
              <span>{formatNumber(parsedAmount)} {from}</span>
              <ArrowRight className="h-5 w-5 text-blue-500 shrink-0" />
              <span className="text-blue-600">{formatNumber(result.result)} {to}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400 flex items-center gap-3 flex-wrap">
              <span>1 {from} = {formatNumber(result.rate, 6)} {to}</span>
              {result.meta?.cached && (
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">cached</span>
              )}
              {result.meta?.stale && (
                <span className="bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded">stale</span>
              )}
              {result.meta?.source && (
                <span className="text-gray-400">via {result.meta.source.replace(/_/g, ' ')}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">Enter an amount to convert</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <ForceRefreshButton from={from} to={to} onRefresh={() => refetch()} />
        {result?.meta?.fetched_at && (
          <span className="text-xs text-gray-400">
            Updated {new Date(result.meta.fetched_at).toLocaleTimeString()}
          </span>
        )}
      </div>

      <MultiOutput from={from} amount={parsedAmount} exclude={to} />
    </div>
  );
}
