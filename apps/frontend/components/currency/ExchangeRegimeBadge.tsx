const CONFIG: Record<string, { label: string; color: string }> = {
  floating:      { label: 'Floating',      color: 'bg-green-100 text-green-700' },
  pegged:        { label: 'Pegged',        color: 'bg-blue-100 text-blue-700' },
  managed_float: { label: 'Managed Float', color: 'bg-yellow-100 text-yellow-700' },
};

export function ExchangeRegimeBadge({ regime }: { regime?: string }) {
  const cfg = CONFIG[regime || ''] || { label: regime || 'Unknown', color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
