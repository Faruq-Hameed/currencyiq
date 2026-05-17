'use client';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Activity, Calendar } from 'lucide-react';

interface UsageData { requests_today: number; requests_this_month: number }

export function UsageStats() {
  const { data, isLoading } = useQuery<UsageData | null>({
    queryKey: ['usage-me'],
    queryFn: () => api.get('/usage/me').then((r) => unwrap<UsageData>(r)),
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <span className="font-medium text-gray-700 text-sm">Requests Today</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {isLoading ? '...' : (data?.requests_today ?? 0)}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          <span className="font-medium text-gray-700 text-sm">Requests This Month</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {isLoading ? '...' : (data?.requests_this_month ?? 0)}
        </div>
      </div>
    </div>
  );
}
