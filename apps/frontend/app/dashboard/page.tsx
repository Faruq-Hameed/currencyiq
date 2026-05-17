import { UsageStats } from '@/components/dashboard/UsageStats';
import Link from 'next/link';
import { Key } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your CurrencyIQ API usage overview</p>
      </div>

      <UsageStats />

      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><Key className="h-5 w-5 text-blue-600" /></div>
          <div>
            <div className="font-medium text-gray-800">API Keys</div>
            <div className="text-sm text-gray-500">Manage your access keys</div>
          </div>
        </div>
        <Link href="/dashboard/keys" className="text-sm font-medium text-blue-600 hover:underline">View keys →</Link>
      </div>
    </div>
  );
}
