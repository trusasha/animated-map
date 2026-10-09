import type { Mode } from '../../../domain/types';
import type { ModelStatus } from '../../../domain/figures';
import { Badge, Button, ThumbnailTile } from '../../../ds';
import { useT } from '../../../i18n/react';

export interface FigureCardProps {
  name: string;
  mode: Mode | null;
  status: ModelStatus;
  /** resolved thumbnail; absent while rendering or before the model exists */
  src?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function FigureCard({ name, mode, status, src, onEdit, onDelete }: FigureCardProps) {
  const { t } = useT();
  const sub = status.kind === 'pending' ? t('figures.list.generatingMeta')
    : status.kind === 'failed' ? t('figures.list.failedMeta')
      : t('figures.list.travelsBy', { mode: t(`common.mode.${mode ?? 'any'}`) });
  const badge = { ready: 'success', pending: 'warning', failed: 'neutral' } as const;
  const label = { ready: 'figures.status.ready', pending: 'figures.status.generating', failed: 'figures.status.failed' } as const;
  return (
    <ThumbnailTile
      size={120}
      onSelect={status.kind === 'ready' ? onEdit : undefined}
      src={src}
      name={name}
      sub={sub}
      badge={<Badge tone={badge[status.kind]}>{t(label[status.kind])}</Badge>}
      footer={
        <>
          {status.kind === 'ready' && <Button variant="secondary" size="sm" onClick={onEdit}>{t('common.actions.edit')}</Button>}
          <Button variant="ghost" size="sm" onClick={onDelete}>{t('figures.list.deleteAction')}</Button>
        </>
      }
    />
  );
}
