/** errors from the same place repeat every frame; one report per message is enough */
const MAX_REPORTS = 20;

/** uncaught errors and rejected promises the app never handled */
export function installGlobalErrorHandlers(report: (data: { kind: string; message: string; stack?: string; source?: string }) => void) {
  const seen = new Set<string>();
  const send = (kind: string, e: unknown, source?: string) => {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    if (seen.has(message) || seen.size >= MAX_REPORTS) return;
    seen.add(message);
    report({ kind, message, stack: e instanceof Error ? e.stack?.slice(0, 1500) : undefined, source });
  };
  const onError = (ev: ErrorEvent) => send('error', ev.error ?? ev.message, ev.filename ? `${ev.filename}:${ev.lineno}` : undefined);
  const onRejection = (ev: PromiseRejectionEvent) => send('rejection', ev.reason);
  addEventListener('error', onError);
  addEventListener('unhandledrejection', onRejection);
  return () => { removeEventListener('error', onError); removeEventListener('unhandledrejection', onRejection); };
}
