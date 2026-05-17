'use client';
import { useState } from 'react';
import { ratesApi } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

interface Props { from: string; to: string; onRefresh: () => void }

export function ForceRefreshButton({ from, to, onRefresh }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'limited'>('idle');

  const handleRefresh = async () => {
    setState('loading');
    let next: 'idle' | 'done' | 'limited' = 'idle';
    try {
      const res = await ratesApi.refresh(from, to);
      const result = res.data?.data || res.data;
      if (result?.fresh === false && result?.reason === 'quota_exceeded') {
        next = 'limited';
      } else {
        next = 'done';
        onRefresh();
      }
    } catch (e: any) {
      next = e?.response?.status === 429 ? 'limited' : 'idle';
    }
    setState(next);
    if (next !== 'idle') setTimeout(() => setState('idle'), 3000);
  };

  const labels = { idle: 'Force Refresh', loading: 'Refreshing...', done: 'Refreshed!', limited: 'Daily limit reached' };
  const colors = { idle: 'text-blue-600 hover:text-blue-700', loading: 'text-gray-400', done: 'text-green-600', limited: 'text-orange-500' };

  return (
    <button
      onClick={handleRefresh}
      disabled={state === 'loading'}
      className={`flex items-center gap-1.5 text-xs font-medium transition ${colors[state]}`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} />
      {labels[state]}
    </button>
  );
}
