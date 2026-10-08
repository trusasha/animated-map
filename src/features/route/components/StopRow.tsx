import type { Stop } from '../../../domain/types';
import { Badge, IconButton, ListRow, Menu, NumberBadge, type MenuEntry } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './RoutePanel.module.css';

export interface StopRowProps {
  index: number;
  stop: Stop;
  count: number;
  /** endpoint of the selected segment */
  endpoint: boolean;
  picking: boolean;
  /** coarse pointer: copy says "tap" */
  touch: boolean;
  canPick: boolean;
  outOfRange: boolean;
  onMove: (dir: -1 | 1) => void;
  onPick: () => void;
  onDelete: () => void;
}

export function StopRow({ index, stop, count, endpoint, picking, touch, canPick, outOfRange, onMove, onPick, onDelete }: StopRowProps) {
  const { t } = useT();
  const first = index === 0, last = index === count - 1;
  const variant = stop.approx ? 'approximate' : endpoint || picking ? 'selected' : first || last ? 'filled' : 'outline';
  const role = first ? t('route.stop.start') : last ? t('route.stop.finish') : null;
  const meta = picking ? <span className={styles.picking}>{t(touch ? 'route.stop.pickingTouch' : 'route.stop.picking')}</span>
    : stop.approx ? t('route.stop.approximateHint') : stop.sub;

  const up = { label: t('route.stop.moveUp'), disabled: first, onSelect: () => onMove(-1) };
  const down = { label: t('route.stop.moveDown'), disabled: last, onSelect: () => onMove(1) };
  const menu: MenuEntry[] = [
    { key: 'up', icon: 'arrow-up', ...up },
    { key: 'down', icon: 'arrow-down', ...down },
    { key: 'move', icon: 'map-pin', label: t('route.stop.moveOnMap'), disabled: !canPick, onSelect: onPick },
    { key: 'delete', icon: 'trash-2', label: t('route.stop.delete'), danger: true, onSelect: onDelete },
  ];

  return (
    <ListRow
      data-testid="stop-row"
      data-idx={index}
      leading={<NumberBadge value={index + 1} variant={variant} />}
      title={<>{stop.name}{role && <span className={styles.role}>{role}</span>}</>}
      meta={meta}
      trailing={stop.approx ? <Badge tone="warning">{t('route.stop.approximate')}</Badge> : undefined}
      outOfRange={outOfRange}
      actionsVisible={picking}
      actions={
        <>
          <IconButton icon="arrow-up" label={up.label} disabled={up.disabled} onClick={up.onSelect} />
          <IconButton icon="arrow-down" label={down.label} disabled={down.disabled} onClick={down.onSelect} />
          <IconButton icon="map-pin" label={t('route.stop.move')} active={picking} disabled={!canPick} onClick={onPick} />
          <IconButton icon="trash-2" label={t('route.stop.delete')} onClick={onDelete} />
        </>
      }
      actionsMenu={<Menu trigger={<IconButton icon="more-horizontal" label={t('route.stop.moreActions')} size="touch" />} items={menu} />}
    />
  );
}
