import type { Dict } from '../en';
import type { Shape } from '../keys';

export const trips: Shape<Dict['trips']> = {
  meta: '{stops} · {modes}',
  header: {
    tripName: 'Название путешествия',
    saving: 'Сохранение…',
    saved: 'Сохранено',
    saveFailed: 'Не сохранено',
    newTrip: 'Новое путешествие',
    preview: 'Превью',
    exportVideo: 'Экспорт видео',
    export: 'Экспорт',
    settings: 'Настройки',
    figures: 'Мои фигурки',
  },
  rename: { title: 'Переименовать путешествие', label: 'Название', placeholder: 'Название путешествия' },
  delete: {
    action: 'Удалить путешествие',
    confirmTitle: 'Удалить «{name}»?',
    confirmBody: 'Путешествие будет удалено без возможности восстановления.',
  },
  defaultName: 'Новое путешествие',
  firstTrip: 'Моё путешествие',
};
