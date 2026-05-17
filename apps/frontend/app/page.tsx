import { ConverterWidget } from '@/components/converter/ConverterWidget';
import { RateHistoryChart } from '@/components/charts/RateHistoryChart';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
          Real-time Currency Conversion
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Convert any world currency with live rates, historical charts, and rich metadata.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <ConverterWidget />
        <RateHistoryChart from="USD" to="NGN" />
      </div>

      <div className="mt-16 bg-blue-600 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-2">Build with CurrencyIQ API</h2>
        <p className="text-blue-100 mb-6 max-w-md mx-auto">
          Free tier available. Up to 1,500 requests/month. Supports 160+ currencies.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition">
            Get API Key — Free
          </Link>
          <Link href="/docs" className="border border-blue-400 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View API Docs
          </Link>
        </div>
      </div>
    </div>
  );
}
