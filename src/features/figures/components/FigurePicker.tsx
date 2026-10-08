import { ThumbnailGrid, ThumbnailTile } from '../../../ds';
import { useT } from '../../../i18n/react';
import { useFigureOptions } from '../hooks/useFigureOptions';
import type { FigurePickerProps } from '../types';

export function FigurePicker({ mode, value, onChange, onAddOwn }: FigurePickerProps) {
  const { t } = useT();
  const tiles = useFigureOptions(mode);
  return (
    <ThumbnailGrid columns={3} role="group" aria-label={t('inspector.figure')}>
      {tiles.map((tile) => (
        <ThumbnailTile
          key={tile.id}
          size={60}
          src={tile.src}
          name={tile.name}
          sub={tile.sub}
          selected={value === tile.id}
          disabled={tile.generating}
          onSelect={() => onChange(tile.id)}
        />
      ))}
      {onAddOwn && <ThumbnailTile size={60} add name={t('inspector.addOwn')} onSelect={onAddOwn} />}
    </ThumbnailGrid>
  );
}
