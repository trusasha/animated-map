import { modelStatus } from '../../../domain/figures';
import type { CustomModel } from '../../../domain/types';
import { ThumbnailGrid } from '../../../ds';
import { useT } from '../../../i18n/react';
import { FigureCard } from './FigureCard';
import styles from './Figures.module.css';

export interface FiguresListProps {
  models: CustomModel[];
  thumb: (m: CustomModel) => string | undefined;
  onEdit: (m: CustomModel) => void;
  onDelete: (m: CustomModel) => void;
}

export function FiguresList({ models, thumb, onEdit, onDelete }: FiguresListProps) {
  const { t } = useT();
  if (!models.length) return <p className={styles.empty}>{t('figures.list.empty')}</p>;
  return (
    <ThumbnailGrid data-testid="figures-list">
      {models.map((m) => (
        <FigureCard key={m.id} name={m.name} mode={m.mode} status={modelStatus(m.status)} src={thumb(m)} onEdit={() => onEdit(m)} onDelete={() => onDelete(m)} />
      ))}
    </ThumbnailGrid>
  );
}
