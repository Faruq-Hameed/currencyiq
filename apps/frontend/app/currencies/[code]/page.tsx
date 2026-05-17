'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { currenciesApi, ratesApi, unwrap } from '@/lib/api';
import { upgradeFlagSize } from '@/lib/flags';
import { ExchangeRegimeBadge } from '@/components/currency/ExchangeRegimeBadge';
import { DenominationGrid } from '@/components/currency/DenominationGrid';
import { RateHistoryChart } from '@/components/charts/RateHistoryChart';
import { ConverterWidget } from '@/components/converter/ConverterWidget';
import { ExternalLink } from 'lucide-react';

interface Banknote { denomination: number; label: string; type: string }
interface CurrencyDetail {
  code: string; name: string; symbol?: string; flag_url?: string;
  countries?: string[]; subunit?: string; subunit_to_unit?: number;
  exchange_regime?: string; central_bank?: string; central_bank_url?: string;
  banknotes?: Banknote[];
}
interface ConvertResult { rate: number }

interface Props { params: Promise<{ code: string }> }

export default function CurrencyPage({ params }: Props) {
  const { code } = use(params);
  const upper = code.toUpperCase();

  const { data: c, isLoading, isError } = useQuery<CurrencyDetail | null>({
    queryKey: ['currency', upper],
    queryFn: () => currenciesApi.get(upper).then((r) => unwrap<CurrencyDetail>(r)),
  });

  const { data: rateResult } = useQuery<ConvertResult | null>({
    queryKey: ['convert', upper, 'USD', 1],
    queryFn: () => ratesApi.convert(upper, 'USD', 1).then((r) => unwrap<ConvertResult>(r)),
    enabled: upper !== 'USD',
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-red-500">
        Failed to load currency <strong>{upper}</strong>. Please try again.
      </div>
    );
  }

  if (!c) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-gray-500">
        Currency <strong>{upper}</strong> not found.
      </div>
    );
  }

  const banknotes: Banknote[] = c.banknotes || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        {c.flag_url && (
          <img src={upgradeFlagSize(c.flag_url, 320)!} alt={c.code} className="h-16 w-24 object-cover rounded-xl shadow" />
        )}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900">{c.name}</h1>
            <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">{c.code}</span>
            {c.symbol && <span className="text-2xl text-gray-500">{c.symbol}</span>}
          </div>
          {c.countries && c.countries.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Used in: {c.countries.slice(0, 5).join(', ')}
              {c.countries.length > 5 ? ` +${c.countries.length - 5} more` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Metadata */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Currency Details</h2>

          {c.subunit && (
            <div>
              <div className="text-xs text-gray-400">Subunit</div>
              <div className="text-sm font-medium">
                {c.subunit_to_unit ?? 100} {c.subunit} = 1 {c.name}
              </div>
            </div>
          )}

          {c.exchange_regime && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Exchange Regime</div>
              <ExchangeRegimeBadge regime={c.exchange_regime} />
            </div>
          )}

          {c.central_bank && (
            <div>
              <div className="text-xs text-gray-400">Central Bank</div>
              {c.central_bank_url ? (
                <a
                  href={c.central_bank_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:underline"
                >
                  {c.central_bank} <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <div className="text-sm font-medium">{c.central_bank}</div>
              )}
            </div>
          )}

          {rateResult?.rate != null && upper !== 'USD' && (
            <div>
              <div className="text-xs text-gray-400">Live Rate vs USD</div>
              <div className="text-sm font-medium">
                1 {upper} = {rateResult.rate.toFixed(6)} USD
              </div>
            </div>
          )}
        </div>

        {/* Denominations */}
        {banknotes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Denominations</h2>
            <DenominationGrid items={banknotes} type="note" symbol={c.symbol} />
            <DenominationGrid items={banknotes} type="coin" symbol={c.symbol} />
          </div>
        )}
      </div>

      {upper !== 'USD' && <RateHistoryChart from={upper} to="USD" />}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Convert {c.name}</h2>
        <ConverterWidget />
      </div>
    </div>
  );
}
