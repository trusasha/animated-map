import { useState } from 'react';
import { useT } from '../../../i18n/react';
import { reportError, useToasts } from '../../toasts';
import { useAiParse, type ComposerTripApi } from './useAiParse';
import { useVoice } from './useVoice';

export function useComposer(api: ComposerTripApi, onDone?: () => void) {
  const { t } = useT();
  const { push } = useToasts();
  const [text, setText] = useState('');
  const ai = useAiParse(api);

  const build = async (value: string) => {
    if (await ai.parse(value)) {
      setText('');
      onDone?.();
    }
  };
  const voice = useVoice({
    onText: (heard) => { setText(heard); void build(heard); },
    onError: reportError,
    onDenied: () => push({ tone: 'error', message: t('composer.micDenied') }),
  });

  const status = voice.state === 'recording' ? t('composer.status.recording')
    : voice.state === 'recognizing' ? t('composer.status.recognizing')
    : ai.busy ? t('composer.status.reading') : '';
  const locked = ai.enabled !== true;

  return {
    text, setText, status, recording: voice.state === 'recording', toggleMic: voice.toggle,
    enabled: ai.enabled,
    micDisabled: locked || ai.busy || voice.state === 'recognizing',
    buildDisabled: locked || !text.trim() || !!status,
    build: () => void build(text),
    hasRoute: api.trip.data.stops.length > 0,
  };
}
