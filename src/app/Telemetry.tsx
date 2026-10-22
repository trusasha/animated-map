import { useEffect } from 'react';
import { api, SESSION } from '../services/api';
import { deviceInfo, installGlobalErrorHandlers, takeOrphanJob } from '../services/telemetry';

const seconds = (ms: number) => Math.round(ms / 1000);

/**
 * mounted once behind sign-in, so its first events already carry the user's token: the device of this visit,
 * a job the previous visit died in (a tab killed mid-export), and every error nothing else caught
 */
export function Telemetry() {
  useEffect(() => {
    const device = deviceInfo();
    api.log('session.start', { ...device, path: location.pathname });
    const orphan = takeOrphanJob(SESSION);
    if (orphan) {
      const { job, hidden, startedAt, beatAt, ...state } = orphan;
      // hidden: the user left the tab (the OS may then drop it); otherwise the page died while in front
      api.log(`${job}.${hidden ? 'abandoned' : 'crashed'}`, { ...state, ranS: seconds(beatAt - startedAt), silentS: seconds(Date.now() - beatAt), ...device });
    }
    return installGlobalErrorHandlers((d) => api.log('client.error', d));
  }, []);
  return null;
}
