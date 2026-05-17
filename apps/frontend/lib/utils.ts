import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 4): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

export function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${formatNumber(amount)}`;
}
