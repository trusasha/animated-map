import type { Dict } from '../en';
import type { Shape } from '../keys';

export const inspector: Shape<Dict['inspector']> = {
  caption: 'Участок {index} из {total} · потяните маркер финиша, чтобы перенести его',
  captionShort: 'Участок {index} из {total}',
  allStops: '← Все точки',
  deselect: 'Снять выделение',
  title: '{from} → {to}',
  travelBy: 'Как добираемся',
  modeNote: {
    air: 'Взлетает и летит по дуге.',
    ground: 'Едет по реальным дорогам.',
    water: 'Идёт по прямой.',
  },
  noRoad: 'Дорога здесь не нашлась, поэтому участок идёт по прямой.',
  figure: 'Фигурка',
  yours: 'Ваша',
  generating: 'Создаётся…',
  addOwn: '+ Своя',
  manageFigures: 'Управлять фигурками →',
  color: {
    label: 'Цвет линии',
    onlyThis: 'Только этот участок',
    defaultFor: 'По умолчанию для типа «{mode}»',
    useDefault: 'Как по умолчанию',
    applyAll: 'Применить ко всем участкам',
    custom: 'Свой цвет',
    names: {
      charcoal: 'Графит', blue: 'Синий', teal: 'Бирюзовый', green: 'Зелёный',
      orange: 'Оранжевый', pink: 'Розовый', purple: 'Фиолетовый', brown: 'Коричневый',
    },
  },
  pace: { label: 'Темп', value: '×{value}', help: 'Поверх скорости видео.' },
  smoothing: {
    label: 'Сглаживание',
    exact: 'Нет',
    value: '×{value}',
    exactRoad: 'Точно по дороге',
    smoothTurns: 'Плавные повороты',
    airNote: 'Воздушные участки летят по плавной дуге, сглаживание им не нужно.',
    help: '0 — точно по дороге, больше — плавнее повороты.',
  },
};
