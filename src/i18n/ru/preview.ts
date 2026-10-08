import type { Dict } from '../en';
import type { Shape } from '../keys';

export const preview: Shape<Dict['preview']> = {
  play: '▶ Превью',
  pause: 'Пауза',
  exit: 'Выйти из превью',
  loadingMap: 'Подгружаю карту… {percent}%',
  buffering: 'Буферизация…',
  time: '{current} / {total} с',
  needTwoStops: 'Добавьте хотя бы две точки, чтобы посмотреть превью.',
};
