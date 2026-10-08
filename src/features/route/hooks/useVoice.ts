import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../services/api';

export type VoiceState = 'idle' | 'recording' | 'recognizing';

export interface VoiceHandlers {
  onText: (text: string) => void;
  onError: (e: unknown) => void;
  onDenied: () => void;
}

const MIME_TYPES = ['audio/webm', 'audio/mp4'];

/** record → stop → api.voice → text */
export function useVoice(handlers: VoiceHandlers) {
  const [state, setState] = useState<VoiceState>('idle');
  const recorder = useRef<MediaRecorder | null>(null);
  const latest = useRef(handlers);
  useEffect(() => { latest.current = handlers; });

  const start = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      latest.current.onDenied();
      return;
    }
    const mimeType = MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m));
    const r = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      setState('recognizing');
      try {
        const { text } = await api.voice(new Blob(chunks, { type: r.mimeType }));
        setState('idle');
        latest.current.onText(text);
      } catch (e) {
        setState('idle');
        latest.current.onError(e);
      }
    };
    r.start();
    recorder.current = r;
    setState('recording');
  }, []);

  const toggle = useCallback(() => {
    if (recorder.current) recorder.current.stop();
    else void start();
  }, [start]);

  useEffect(() => () => {
    const r = recorder.current;
    if (!r) return;
    r.onstop = null;
    if (r.state !== 'inactive') r.stop();
    r.stream.getTracks().forEach((track) => track.stop());
  }, []);

  return { state, toggle };
}
