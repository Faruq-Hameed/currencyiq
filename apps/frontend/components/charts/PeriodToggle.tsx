'use client';

const PERIODS = ['7d', '30d', '90d', '1y'];

interface Props { value: string; onChange: (p: string) => void }

export function PeriodToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
            value === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
