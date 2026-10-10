import { Fragment, useRef } from 'react';
import { RangeRail, SearchCombobox, SortableItem, SortableList, type SortableListLabels } from '../../../ds';
import { useT } from '../../../i18n/react';
import { useTripContext } from '../../trips';
import { useRoutePanel } from '../hooks/useRoutePanel';
import type { RoutePanelProps } from '../types';
import { Composer } from './Composer';
import { EmptyAlternative, EmptyRoute } from './EmptyRoute';
import { PickBanner } from './PickBanner';
import { RangeNote } from './RangeNote';
import { RouteHeader } from './RouteHeader';
import { SegmentRow } from './SegmentRow';
import { StopRow } from './StopRow';
import type { Trip } from '../../../domain/types';
import styles from './RoutePanel.module.css';

function Loaded(props: RoutePanelProps & { trip: Trip }) {
  const { t } = useT();
  const p = useRoutePanel(props, props.trip);
  const listRef = useRef<HTMLDivElement>(null);
  const { stops } = p;
  const reorder: SortableListLabels = {
    instructions: t('route.reorder.instructions'),
    announce: (event, id, position) => t(`route.reorder.${event}`, { name: stops.find((s) => s.id === id)?.name ?? '', position }),
  };
  const search = (
    <SearchCombobox
      className={styles.search}
      label={t(stops.length ? 'route.search.next' : 'route.search.first')}
      placeholder={t(stops.length ? 'route.search.next' : 'route.search.first')}
      value={p.search.query}
      onValueChange={p.search.setQuery}
      items={p.search.items}
      onSelect={p.search.select}
      loading={p.search.loading}
      loadingLabel={t('route.search.loading')}
      emptyLabel={t('route.search.noMatch', { query: p.search.query.trim() })}
      error={p.search.failed ? t('route.search.error') : undefined}
    />
  );
  const composer = (
    <Composer trip={props.trip} update={p.composerTrip.update} onDone={p.composer.close} />
  );

  const empty = !stops.length;
  return (
    <section className={styles.panel} aria-label={t('route.title')}>
      {empty ? <EmptyRoute /> : <RouteHeader count={stops.length} composerOpen={p.composer.open} onToggleComposer={p.composer.toggle} />}
      {!empty && p.composer.open && composer}
      {stops.length >= 3 && <RangeNote range={p.range} onUseWhole={p.editing.clearRange} />}
      {!empty && (
        <div ref={listRef} className={styles.list} data-testid="stop-list">
          <SortableList ids={stops.map((s) => s.id)} onMove={p.editing.move} labels={reorder}>
            {stops.map((stop, i) => (
              <Fragment key={stop.id}>
                <SortableItem id={stop.id} handleLabel={t('route.stop.reorder', { name: stop.name })}>
                  {(handle) => (
                    <StopRow
                      index={i}
                      stop={stop}
                      count={stops.length}
                      endpoint={p.selectedEndpoint(i)}
                      picking={p.pick.pickingId === stop.id}
                      touch={p.touch}
                      canPick={p.pick.canPick}
                      outOfRange={i < p.span.from || i > p.span.to}
                      handle={handle}
                      onPick={() => (p.pick.pickingId === stop.id ? p.pick.stop() : p.pick.start(stop.id))}
                      onDelete={() => p.editing.remove(i)}
                    />
                  )}
                </SortableItem>
                {i < stops.length - 1 && <SegmentRow {...p.segments[i]} onSelect={() => props.onSelect(props.selected === i ? null : i)} />}
              </Fragment>
            ))}
          </SortableList>
          <RangeRail
            count={stops.length}
            from={p.span.from}
            to={p.span.to}
            onChange={p.editing.setRange}
            containerRef={listRef}
            labels={{
              from: t('route.range.dragStart'),
              to: t('route.range.dragEnd'),
              rowClick: t(p.touch ? 'route.range.moveNearestTouch' : 'route.range.moveNearest'),
              valueText: (idx) => stops[idx]?.name ?? '',
            }}
          />
        </div>
      )}
      {search}
      {empty && <EmptyAlternative>{composer}</EmptyAlternative>}
      {p.picking && <PickBanner name={p.picking.name} touch={p.touch} onCancel={p.pick.stop} />}
    </section>
  );
}

export function RoutePanel(props: RoutePanelProps) {
  const { trip } = useTripContext();
  return trip ? <Loaded {...props} trip={trip} /> : null;
}
