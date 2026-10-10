import type { Dict } from '../en';
import type { Shape } from '../keys';

export const auth: Shape<Dict['auth']> = {
  title: 'Войдите, чтобы сохранять путешествия.',
  lead: 'Мы пришлём ссылку для входа на почту. Пароль не нужен.',
  email: 'Почта',
  emailPlaceholder: 'you@example.com',
  sendLink: 'Отправить ссылку',
  or: 'или',
  google: 'Продолжить с Google',
  invalidEmail: 'Введите корректный адрес почты.',
  sendFailed: 'Не удалось отправить ссылку. Попробуйте через минуту.',
  googleFailed: 'Не удалось открыть вход через Google.',
  sent: {
    title: 'Проверьте почту.',
    lead: 'Мы отправили ссылку для входа на {email}. Откройте её, чтобы продолжить.',
    otherEmail: 'Другая почта',
  },
  account: {
    signedInAs: 'Вы вошли как {email}',
    signOut: 'Выйти',
  },
};
