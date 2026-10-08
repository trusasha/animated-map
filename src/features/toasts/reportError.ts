import { api } from '../../services/api';

type Sink = (message: string) => void;

let sink: Sink | null = null;
const pending: string[] = [];

/** the ToastProvider registers here; errors raised before it mounts are shown once it does */
export function registerErrorSink(next: Sink | null) {
  sink = next;
  if (next) pending.splice(0).forEach(next);
}

export function reportError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  api.log('error', { message, stack: e instanceof Error ? e.stack?.slice(0, 1500) : undefined });
  if (sink) sink(message);
  else pending.push(message);
}
