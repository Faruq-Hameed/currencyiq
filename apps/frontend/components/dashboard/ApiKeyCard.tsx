'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keysApi } from '@/lib/api';

export interface ApiKeyData {
  id: string; prefix: string; name?: string;
  is_active: boolean; last_used_at?: string; created_at: string;
}
import { Key, Trash2, Clock } from 'lucide-react';

export function ApiKeyCard({ apiKey }: { apiKey: ApiKeyData }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const revoke = useMutation({
    mutationFn: () => keysApi.revoke(apiKey.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keys'] }),
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Key className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="font-medium text-gray-800 text-sm">{apiKey.name || 'Unnamed key'}</div>
          <div className="text-xs text-gray-400 font-mono">{apiKey.prefix}••••••••••••••••</div>
          {apiKey.last_used_at && (
            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              Last used {new Date(apiKey.last_used_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${apiKey.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {apiKey.is_active ? 'Active' : 'Revoked'}
        </span>
        {apiKey.is_active && (
          confirming ? (
            <div className="flex gap-1">
              <button onClick={() => revoke.mutate()} className="text-xs text-red-600 font-medium px-2 py-1 border border-red-200 rounded hover:bg-red-50">
                Confirm
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 px-2 py-1">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
              <Trash2 className="h-4 w-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
