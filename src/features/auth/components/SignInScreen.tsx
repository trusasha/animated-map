import type { FormEvent } from 'react';
import { Button, Callout, Input } from '../../../ds';
import { useT } from '../../../i18n/react';
import type { SignInScreenProps } from '../types';
import styles from './SignInScreen.module.css';

export function SignInScreen({ email, step, error, onEmailChange, onSendLink, onGoogle, onOtherEmail }: SignInScreenProps) {
  const { t } = useT();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSendLink();
  };

  return (
    <main className={styles.page} data-testid="sign-in">
      <div className={styles.wordmark}>{t('common.appName')}</div>
      <div className={styles.content}>
        {step === 'sent' ? (
          <>
            <h1 className={styles.title}>{t('auth.sent.title')}</h1>
            <p className={styles.lead}>{t('auth.sent.lead', { email: email.trim() })}</p>
            <Button variant="secondary" size="lg" onClick={onOtherEmail}>{t('auth.sent.otherEmail')}</Button>
          </>
        ) : (
          <>
            <h1 className={styles.title}>{t('auth.title')}</h1>
            <p className={styles.lead}>{t('auth.lead')}</p>
            <form className={styles.form} onSubmit={submit} noValidate>
              <Input
                type="email"
                autoComplete="email"
                label={t('auth.email')}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
              />
              <Button type="submit" size="lg" loading={step === 'sending'}>{t('auth.sendLink')}</Button>
            </form>
            <div className={styles.or}>{t('auth.or')}</div>
            <Button variant="secondary" size="lg" onClick={onGoogle}>{t('auth.google')}</Button>
          </>
        )}
        {error && <Callout tone="error" live>{error}</Callout>}
      </div>
    </main>
  );
}
