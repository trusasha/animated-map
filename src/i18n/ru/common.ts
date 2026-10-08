import type { Dict } from '../en';
import type { Shape } from '../keys';

export const common: Shape<Dict['common']> = {
  appName: 'Trip Animator',
  actions: {
    done: 'Готово', cancel: 'Отмена', close: 'Закрыть', delete: 'Удалить', save: 'Сохранить', edit: 'Редактировать', back: 'Назад',
    reset: 'Сбросить', apply: 'Применить', retry: 'Повторить', undo: 'Отменить', more: 'Ещё', loading: 'Загрузка…',
  },
  mode: { air: 'Воздух', ground: 'Земля', water: 'Вода', any: 'Любой' },
  stops: { one: '{count} точка', few: '{count} точки', many: '{count} точек', other: '{count} точки' },
  noStopsYet: 'Точек пока нет',
  time: {
    now: 'Только что',
    minutes: '{count} мин назад',
    hours: '{count} ч назад',
    yesterday: 'Вчера',
  },
  aria: {
    home: 'На главную',
    expandPanel: 'Развернуть панель',
    collapsePanel: 'Свернуть панель',
    settings: 'Настройки',
    more: 'Ещё',
    close: 'Закрыть',
  },
  boot: { loading: 'Загрузка…' },
};
