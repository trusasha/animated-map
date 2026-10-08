import { useState } from 'react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { ThumbnailGrid } from './ThumbnailGrid';
import { ThumbnailTile } from './ThumbnailTile';

export const title = 'Thumbnail';

const swatch = (fill: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="${fill}"/></svg>`)}`;

const figures = [
  { id: 'plane', name: 'Plane', sub: 'Travels by: Air', src: swatch('#2a9d99') },
  { id: 'car', name: 'Car', sub: 'Travels by: Land', src: swatch('#dd5b00') },
  { id: 'ship', name: 'Ship', sub: 'Travels by: Water', src: swatch('#0075de') },
];

export default function Demo() {
  const [picked, setPicked] = useState('car');
  return (
    <div data-testid="demo-Thumbnail" style={{ display: 'grid', gap: 'var(--space-16)', maxWidth: 640 }}>
      <ThumbnailGrid columns={3}>
        {figures.map((f) => (
          <ThumbnailTile key={f.id} size={60} src={f.src} name={f.name} sub={f.sub} selected={picked === f.id} onClick={() => setPicked(f.id)} />
        ))}
        <ThumbnailTile size={60} name="Add" sub="Upload a model" add onClick={() => undefined} />
        <ThumbnailTile size={60} src={swatch('#a39e98')} name="Locked" sub="Not for this segment" disabled onClick={() => undefined} />
      </ThumbnailGrid>
      <ThumbnailGrid>
        {figures.slice(0, 2).map((f, i) => (
          <ThumbnailTile
            key={f.id}
            size={120}
            src={f.src}
            name={f.name}
            sub={f.sub}
            badge={<Badge tone={i ? 'warning' : 'success'}>{i ? 'Generating…' : 'Ready'}</Badge>}
            footer={<><Button variant="secondary" size="sm">Edit</Button><Button variant="ghost" size="sm">Delete</Button></>}
          />
        ))}
      </ThumbnailGrid>
      <ThumbnailTile size={40} src={figures[0].src} name="Compact row" sub="40px well" />
    </div>
  );
}
