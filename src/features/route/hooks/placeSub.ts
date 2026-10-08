import type { Place } from '../../../domain/types';

/** "Paris, France" under the name "Paris" is "France": the part of the label after the name */
export const placeSub = (p: Pick<Place, 'name' | 'label'>): string | undefined => {
  const rest = p.label.startsWith(`${p.name}, `) ? p.label.slice(p.name.length + 2) : p.label === p.name ? '' : p.label;
  return rest || undefined;
};
