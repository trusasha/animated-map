import { api as client } from './services/api';
import type { Trip } from './types';

export { ApiError } from './services/api';

/** legacy callers only read id/title from list items */
export const api = { ...client, trips: () => client.trips() as unknown as Promise<Trip[]> };
