import type { Dict } from '../en';
import type { Shape } from '../keys';

export const settings: Shape<Dict['settings']> = {
  title: 'Настройки',
  subtitle: 'Действуют для всех ваших путешествий.',
  appearance: { title: 'Оформление', light: 'Светлое', dark: 'Тёмное', system: 'Как в системе' },
  language: { title: 'Язык', ru: 'Русский', en: 'English' },
  figures: { title: 'Фигурки по умолчанию', help: 'Берутся для новых участков каждого типа.' },
  colors: { title: 'Цвета линий', help: 'Участки со своим цветом его сохраняют.' },
  newSegments: {
    title: 'Новые участки',
    flyWhen: 'Лететь, если следующая точка дальше {km}',
    help: 'Более близкие точки начинаются как наземные участки.',
  },
  exportQuality: {
    title: 'Качество экспорта',
    help: 'Размер длинной стороны видео.',
    px1080: '1080 px',
    px1920: '1920 px',
  },
  done: 'Готово',
  reset: 'Сбросить настройки',
};
