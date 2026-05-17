interface Banknote { denomination: number; label: string; type: string }

interface Props { items: Banknote[]; type: 'note' | 'coin'; symbol?: string }

export function DenominationGrid({ items, type, symbol }: Props) {
  const filtered = items.filter((i) => i.type === type);
  if (!filtered.length) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize">{type === 'note' ? 'Banknotes' : 'Coins'}</h4>
      <div className="flex flex-wrap gap-2">
        {filtered.map((item) => (
          <div
            key={item.denomination}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              type === 'note'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
