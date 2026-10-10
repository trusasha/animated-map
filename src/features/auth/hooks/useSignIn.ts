import { useState } from 'react';
import { useT } from '../../../i18n/react';
import type { AuthService } from '../../../services/auth';
import type { SignInScreenProps, SignInStep } from '../types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useSignIn(service: AuthService): SignInScreenProps {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<SignInStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSendLink = () => {
    const address = email.trim();
    if (!EMAIL.test(address)) return setError(t('auth.invalidEmail'));
    setError(null);
    setStep('sending');
    service.signInWithEmail(address).then(() => setStep('sent'), () => {
      setError(t('auth.sendFailed'));
      setStep('idle');
    });
  };

  return {
    email, step, error,
    onEmailChange: (v) => { setEmail(v); setError(null); },
    onSendLink,
    onGoogle: () => { setError(null); service.signInWithGoogle().catch(() => setError(t('auth.googleFailed'))); },
    onOtherEmail: () => { setStep('idle'); setError(null); },
  };
}
