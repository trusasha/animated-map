import { useEffect, useMemo, useState } from 'react';
import { figureOptions } from '../../../domain/figures';
import type { CustomModel, Mode } from '../../../domain/types';
import type { Key } from '../../../i18n';
import { useT } from '../../../i18n/react';
import { figureThumb } from '../../../services/scene3d';

export interface FigureTile { id: string; name: string; src?: string }
export interface FigureRow { mode: Mode; tiles: FigureTile[] }

const MODES: Mode[] = ['air', 'ground', 'water'];

/** per-mode figure tiles with 3D thumbnails that fill in as they render */
export function useFigureRows(models: CustomModel[]): FigureRow[] {
  const { t } = useT();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const options = useMemo(() => MODES.map((mode) => ({ mode, options: figureOptions(mode, models) })), [models]);

  useEffect(() => {
    let alive = true;
    for (const { options: list } of options) {
      for (const o of list) {
        figureThumb(o.id, o.model?.pose ?? undefined)
          .then((src) => { if (alive) setThumbs((cur) => (cur[o.id] === src ? cur : { ...cur, [o.id]: src })); })
          .catch(() => {});
      }
    }
    return () => { alive = false; };
  }, [options]);

  return options.map(({ mode, options: list }) => ({
    mode,
    tiles: list.map((o) => ({
      id: o.id,
      name: o.model ? o.model.name : t(`figures.names.${o.id}` as Key),
      src: thumbs[o.id],
    })),
  }));
}
