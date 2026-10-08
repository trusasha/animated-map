import { useEffect, useState } from 'react';
import { SearchCombobox, type SearchItem } from './SearchCombobox';

export const title = 'SearchCombobox';

const PLACES: SearchItem[] = [
  { id: 'ber', title: 'Berlin', sub: 'Germany' },
  { id: 'bar', title: 'Barcelona', sub: 'Catalonia, Spain' },
  { id: 'bud', title: 'Budapest', sub: 'Hungary' },
  { id: 'bru', title: 'Brussels', sub: 'Belgium' },
  { id: 'bel', title: 'Belgrade', sub: 'Serbia' },
  { id: 'ber2', title: 'Bern', sub: 'Switzerland' },
  { id: 'bre', title: 'Bremen', sub: 'Germany' },
  { id: 'rom', title: 'Rome', sub: 'Italy' },
];

export default function Demo() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const timer = setTimeout(() => {
      setItems(PLACES.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 6));
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const onQuery = (next: string) => {
    setQuery(next);
    setLoading(next.trim() !== '');
  };

  return (
    <div data-testid="demo-SearchCombobox" style={{ display: 'grid', gap: 'var(--space-12)' }}>
      <div style={{ height: 200, overflow: 'auto', padding: 'var(--space-12)', border: 'var(--border-whisper)', borderRadius: 'var(--radius-standard)' }}>
        <SearchCombobox
          label="Add the next stop"
          placeholder="Add the next stop"
          value={query}
          onValueChange={onQuery}
          items={query.trim() ? items : []}
          loading={loading}
          emptyLabel={`No places match “${query.trim()}”.`}
          onSelect={(item) => {
            setPicked((p) => [...p, item.title]);
            onQuery('');
          }}
        />
        <div style={{ height: 400 }} />
      </div>
      <span>Picked: {picked.join(', ') || 'none'}</span>
    </div>
  );
}
