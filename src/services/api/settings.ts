import type { UserSettings } from '../../domain/types';
import type { AuthConfig } from '../auth';
import { jsonBody, req } from './http';

export const settings = {
  config: () => req<{ openai: boolean; photo3d: boolean; auth?: AuthConfig | null }>('/api/config'),
  settings: () => req<UserSettings>('/api/settings'),
  saveSettings: (s: UserSettings) => req<UserSettings>('/api/settings', jsonBody('PUT', s)),
};
