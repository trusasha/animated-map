import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type Announcements, type DragEndEvent, type Modifier, type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KeyboardEventHandler, PointerEvent, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import styles from './SortableList.module.css';

export type SortableEvent = 'start' | 'over' | 'end' | 'cancel';

export type SortableListLabels = {
  /** Read once when a handle gets focus: how to pick up, move and drop. */
  instructions: string;
  /** Live-region text; `position` is 1-based. */
  announce: (event: SortableEvent, id: string, position: number) => string;
};

export type SortableListProps = {
  ids: string[];
  onMove: (from: number, to: number) => void;
  labels: SortableListLabels;
  /** Items, freely mixed with static content that stays in place (e.g. separators between them). */
  children: ReactNode;
};

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function SortableList({ ids, onMove, labels, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const at = (id: UniqueIdentifier | undefined) => ids.indexOf(String(id)) + 1;
  const say = (event: SortableEvent, id: UniqueIdentifier, over?: UniqueIdentifier) =>
    labels.announce(event, String(id), at(over ?? id));
  const announcements: Announcements = {
    onDragStart: ({ active }) => say('start', active.id),
    onDragOver: ({ active, over }) => (over ? say('over', active.id, over.id) : undefined),
    onDragEnd: ({ active, over }) => say('end', active.id, over?.id),
    onDragCancel: ({ active }) => say('cancel', active.id),
  };
  const end = ({ active, over }: DragEndEvent) => {
    const from = ids.indexOf(String(active.id)), to = over ? ids.indexOf(String(over.id)) : -1;
    if (from >= 0 && to >= 0 && from !== to) onMove(from, to);
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      accessibility={{ announcements, screenReaderInstructions: { draggable: labels.instructions } }}
      onDragEnd={end}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>{children}</SortableContext>
    </DndContext>
  );
}

export type SortableItemProps = {
  id: string;
  /** Accessible name of the drag handle. */
  handleLabel: string;
  /** Receives the handle to place inside the item. */
  children: (handle: ReactNode) => ReactNode;
  className?: string;
};

/** Mouse drags the whole item; touch and pen only the handle, so the list still scrolls under a finger. */
export function SortableItem({ id, handleLabel, children, className }: SortableItemProps) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });
  const pointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    const onHandle = !!target.closest('[data-sortable-handle]');
    if (!onHandle && (e.pointerType !== 'mouse' || target.closest('button, a, input, textarea, select'))) return;
    listeners?.onPointerDown?.(e);
  };
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={styles.handle}
      data-sortable-handle=""
      data-own-drag=""
      {...attributes}
      aria-label={handleLabel}
      onKeyDown={listeners?.onKeyDown as KeyboardEventHandler | undefined}
    >
      <Icon name="grip-vertical" size={16} />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      className={cx(styles.item, className)}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-dragging={isDragging || undefined}
      onPointerDown={pointerDown}
    >
      {children(handle)}
    </div>
  );
}
