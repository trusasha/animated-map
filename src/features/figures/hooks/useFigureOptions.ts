import { useMemo } from 'react';
import { figureOptions, modelStatus } from '../../../domain/figures';
import type { Mode } from '../../../domain/types';
import type { Key } from '../../../i18n';
import { useT } from '../../../i18n/react';
import { useFigureThumbs } from './useFigureThumbs';
import { useModels } from './useModels';

export interface FigureTile { id: string; name: string; sub?: string; src?: string; generating?: boolean }

/** tiles for one mode: built-ins, the user's ready figures, then figures still generating (not selectable) */
export function useFigureOptions(mode: Mode): FigureTile[] {
  const { t } = useT();
  const { models } = useModels();
  const options = useMemo(() => figureOptions(mode, models), [mode, models]);
  const pending = useMemo(
    () => models.filter((m) => modelStatus(m.status).kind === 'pending' && (!m.mode || m.mode === mode)),
    [mode, models],
  );
  const thumb = useFigureThumbs(options.map((o) => ({ id: o.id, pose: o.model?.pose })));

  return [
    ...options.map((o) => ({
      id: o.id,
      name: o.model ? o.model.name : t(`figures.names.${o.id}` as Key),
      sub: o.model ? t('inspector.yours') : undefined,
      src: thumb({ id: o.id, pose: o.model?.pose }),
    })),
    ...pending.map((m) => ({ id: `pending:${m.id}`, name: m.name, sub: t('inspector.generating'), generating: true })),
  ];
}
