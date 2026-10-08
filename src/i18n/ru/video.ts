import type { Dict } from '../en';
import type { Shape } from '../keys';

export const video: Shape<Dict['video']> = {
  title: 'Видео',
  mapStyle: 'Карта',
  styles: { satellite: 'Спутник', streets: 'Улицы', dark: 'Тёмная', ukiyoe: 'Японская гравюра' },
  speed: 'Скорость',
  speedValue: '×{value}',
};
