import type { UserSettings } from '../../domain/types';
import { jsonBody, req } from './http';

export const settings = {
  config: () => req<{ openai: boolean; photo3d: boolean }>('/api/config'),
  settings: () => req<UserSettings>('/api/settings'),
  saveSettings: (s: UserSettings) => req<UserSettings>('/api/settings', jsonBody('PUT', s)),
};
