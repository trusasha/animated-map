import { heapMb } from './device';

const KEY = 'ta.job';
/** how often a running job rewrites its marker */
const BEAT_MS = 2000;

export interface JobMarker {
  job: string;
  session: string;
  startedAt: number;
  beatAt: number;
  /** the page was hidden or left normally after the last beat: not a crash */
  hidden?: boolean;
  heapMb?: number | null;
  [k: string]: unknown;
}

const read = (): JobMarker | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } };
const write = (m: JobMarker | null) => { try { if (m) localStorage.setItem(KEY, JSON.stringify(m)); else localStorage.removeItem(KEY); } catch { /* private mode */ } };

/**
 * A black box for long jobs (video export): the marker sits in localStorage while the job runs. A browser that kills
 * the tab (out of memory) never clears it, so the next page load finds it and reports a crash with the last state.
 */
export function createCrashGuard(session: string) {
  let current: JobMarker | null = null, last = 0;
  const onHide = () => { if (current) write({ ...current, hidden: true, beatAt: Date.now() }); };
  const onShow = () => { if (current) write({ ...current, beatAt: Date.now() }); };
  return {
    begin(job: string, data: object) {
      current = { job, session, startedAt: Date.now(), beatAt: Date.now(), heapMb: heapMb(), ...data };
      last = 0;
      write(current);
      addEventListener('pagehide', onHide);
      addEventListener('pageshow', onShow);
    },
    /** throttled: cheap to call every frame */
    beat(data: object) {
      if (!current || Date.now() - last < BEAT_MS) return;
      last = Date.now();
      current = { ...current, ...data, beatAt: last, heapMb: heapMb() };
      write(current);
    },
    /** unthrottled, for where-exactly breadcrumbs (which step of which frame) */
    mark(data: object) {
      if (!current) return;
      current = { ...current, ...data, beatAt: Date.now() };
      write(current);
    },
    end() {
      current = null;
      write(null);
      removeEventListener('pagehide', onHide);
      removeEventListener('pageshow', onShow);
    },
  };
}

/** a marker left by an earlier page load (that page died mid-job), removed once read */
export function takeOrphanJob(session: string): JobMarker | null {
  const m = read();
  if (!m || m.session === session) return null;
  write(null);
  return m;
}
