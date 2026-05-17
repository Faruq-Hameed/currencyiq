'use client';
import { useQuery } from '@tanstack/react-query';
import { keysApi, unwrap } from '@/lib/api';
import { ApiKeyCard } from '@/components/dashboard/ApiKeyCard';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface ApiKeyData {
  id: string; prefix: string; name?: string;
  is_active: boolean; last_used_at?: string; created_at: string;
}

export default function KeysPage() {
  const { data, isLoading } = useQuery<ApiKeyData[]>({
    queryKey: ['keys'],
    queryFn: () => keysApi.list().then((r) => unwrap<ApiKeyData[]>(r) || []),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your API access keys</p>
        </div>
        <Link
          href="/dashboard/keys/new"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" /> New Key
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (data || []).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-3">No API keys yet</p>
          <Link href="/dashboard/keys/new" className="text-blue-600 font-medium hover:underline">
            Create your first key
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(data || []).map((key) => <ApiKeyCard key={key.id} apiKey={key} />)}
        </div>
      )}
    </div>
  );
}
