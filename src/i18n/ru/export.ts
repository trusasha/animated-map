import type { Dict } from '../en';
import type { Shape } from '../keys';

export const exportDialog: Shape<Dict['export']> = {
  title: 'Экспорт видео',
  steps: { prepare: '1. Подготовка', captions: '2. Подписи', render: '3. Рендер', done: '4. Готово' },
  stepOf: 'Шаг {step} из {total}',
  stepperLabel: 'Шаги экспорта',
  frameLabel: 'Предпросмотр кадра',
  prepare: { title: 'Подгружаю карту для видео', cancel: 'Отмена' },
  captions: {
    title: 'Подписи',
    tripName: 'Название путешествия',
    segmentLabel: 'Подпись участка · откуда → куда',
    progress: 'Прогресс-бар',
    attribution: 'Авторство карты',
    attributionNote: 'всегда включено, требуется лицензией карты',
    format: 'Формат',
    formats: {
      '9:16': 'Reels · TikTok',
      '4:5': 'Пост в Instagram',
      '1:1': 'Квадрат',
      '16:9': 'YouTube',
    },
    formatHelp: 'После смены формата кадр перезагрузится за несколько секунд.',
    reloading: 'Перезагружаю карту…',
    render: 'Рендер видео',
    cancel: 'Отмена',
  },
  render: {
    title: 'Рендер кадр за кадром',
    keepOpen: 'Не закрывайте и не сворачивайте вкладку.',
    keepOpenBody: 'Рендер остановится, если переключиться на другую вкладку или свернуть окно.',
    cancel: 'Отменить рендер',
  },
  done: {
    title: 'Видео готово',
    video: 'Готовое видео',
    download: 'Скачать MP4',
    share: 'Поделиться',
    done: 'Готово',
    hint: 'На телефоне «Поделиться» отправит ролик сразу в Instagram или TikTok.',
  },
  error: {
    title: 'Не удалось сделать видео',
    body: 'Во время рендера что-то пошло не так. Попробуйте ещё раз.',
    retry: 'Повторить',
    close: 'Закрыть',
    codecTitle: 'Браузер не умеет кодировать H.264.',
    codecBody: 'Нужен свежий Chrome / Safari / Edge.',
  },
};
