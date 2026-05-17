'use client';
import { useState } from 'react';
import { keysApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Copy, Check } from 'lucide-react';

export default function NewKeyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [plainKey, setPlainKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await keysApi.create(name || undefined);
      const payload = (res.data as any)?.data ?? res.data;
      const key: string = payload?.key;
      if (!key) throw new Error('No key returned');
      setPlainKey(key);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to create key');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(plainKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (plainKey) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Key Created</h1>
          <p className="text-sm text-amber-600 mt-1 font-medium">⚠ Copy this key now — it will never be shown again.</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between gap-3">
          <code className="text-green-400 text-sm break-all">{plainKey}</code>
          <button onClick={handleCopy} className="shrink-0 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-white">
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
          <p className="font-medium mb-2">Usage example:</p>
          <code className="text-xs block text-gray-600">curl https://api.currencyiq.dev/api/v1/rates/convert?from=USD&to=NGN&amount=100 \<br />
          &nbsp;&nbsp;-H "x-api-key: {plainKey.slice(0, 20)}..."</code>
        </div>

        <button onClick={() => router.push('/dashboard/keys')} className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm">
          Go to My Keys
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create API Key</h1>
        <p className="text-sm text-gray-500 mt-1">Give it a name to identify it later</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Key Name (optional)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My App, Production"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button onClick={handleCreate} disabled={loading} className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50">
        {loading ? 'Creating...' : 'Create Key'}
      </button>
    </div>
  );
}
