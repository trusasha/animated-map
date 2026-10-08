import { ThumbnailTile } from '../../../ds';
import type { Mode } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import type { FigureRow } from '../hooks/useFigureRows';
import styles from './Sections.module.css';

interface Props {
  rows: FigureRow[];
  value: Record<Mode, string>;
  onChange: (mode: Mode, figure: string) => void;
}

export function DefaultFiguresSection({ rows, value, onChange }: Props) {
  const { t } = useT();
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>{t('settings.figures.title')}</h3>
      <p className={styles.help}>{t('settings.figures.help')}</p>
      {rows.map((row) => (
        <div key={row.mode} className={styles.row} role="group" aria-label={t(`common.mode.${row.mode}`)}>
          <span className={styles.label}>{t(`common.mode.${row.mode}`)}</span>
          <div className={styles.tiles}>
            {row.tiles.map((tile) => (
              <ThumbnailTile
                key={tile.id}
                size={40}
                src={tile.src}
                name={tile.name}
                selected={value[row.mode] === tile.id}
                onSelect={() => onChange(row.mode, tile.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
