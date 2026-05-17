'use client';
import { useQuery } from '@tanstack/react-query';
import { ratesApi, unwrap } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PeriodToggle } from './PeriodToggle';
import { useState } from 'react';

interface HistoricalRate { date: string; rate: number }
interface HistoryResult { data: HistoricalRate[]; meta?: { cached?: boolean } }

interface Props { from: string; to: string }

export function RateHistoryChart({ from, to }: Props) {
  const [period, setPeriod] = useState('7d');

  const { data, isLoading } = useQuery<HistoricalRate[]>({
    queryKey: ['history', from, to, period],
    queryFn: async () => {
      const res = await ratesApi.history(from, to, period);
      const unwrapped = unwrap<HistoryResult>(res);
      // History service returns { data: [...], meta: {...} }
      return unwrapped?.data ?? (Array.isArray(unwrapped) ? unwrapped : []);
    },
    staleTime: 300_000,
  });

  const history = data || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full max-w-2xl mx-auto mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">{from}/{to} Rate History</h3>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading chart...</div>
      ) : history.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No historical data yet — check back after the first hourly sync.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} width={60} />
            <Tooltip
              formatter={(v) => [Number(v).toLocaleString('en-US', { maximumFractionDigits: 4 }), `${from}/${to}`]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
