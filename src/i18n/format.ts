import type { Lang } from '../domain/types';
import { relativeTimeBucket } from '../domain/trips';
import type { TFn } from '.';

/** Home list time: Just now / N min ago / N h ago / Yesterday / Oct 6 */
export function formatRelativeTime(lang: Lang, t: TFn, updatedAt: string | Date, now: number = Date.now()): string {
  const b = relativeTimeBucket(updatedAt, now);
  switch (b.unit) {
    case 'now': return t('common.time.now');
    case 'minutes': return t('common.time.minutes', { count: b.n });
    case 'hours': return t('common.time.hours', { count: b.n });
    case 'yesterday': return t('common.time.yesterday');
    case 'date': return new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric' }).format(b.date);
  }
}

/** ×1.5, ×1: at most two decimals, no trailing zeros */
export const formatMultiplier = (n: number) => `×${Number(n.toFixed(2))}`;

export const formatKm = (lang: Lang, km: number) =>
  new Intl.NumberFormat(lang, { style: 'unit', unit: 'kilometer', unitDisplay: 'short', maximumFractionDigits: 0 }).format(km);

export const formatNumber = (lang: Lang, n: number) => new Intl.NumberFormat(lang).format(n);
