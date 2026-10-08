import type { CustomModel, LngLat, TripData, TripSummary, Trip, UserSettings } from '../../src/domain/types.ts';

export type Query = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;

/** what Home needs per trip: no paths, no full data */
export interface TripListItem { id: string; title: string; updated_at: string; summary: TripSummary; points: LngLat[] }

export interface TripsRepo {
  list(): Promise<TripListItem[]>;
  get(id: string): Promise<Trip | undefined>;
  create(title: string, data: TripData): Promise<Trip>;
  update(id: string, title: string, data: TripData): Promise<Trip | undefined>;
  remove(id: string): Promise<void>;
}

export interface ModelsRepo {
  list(): Promise<CustomModel[]>;
  get(id: string): Promise<CustomModel | undefined>;
  create(m: Omit<CustomModel, 'id' | 'pose'>): Promise<CustomModel>;
  setState(id: string, url: string | null, status: string): Promise<CustomModel>;
  edit(id: string, m: Pick<CustomModel, 'name' | 'mode' | 'pose'>): Promise<CustomModel | undefined>;
  remove(id: string): Promise<void>;
}

export interface SettingsRepo {
  get(): Promise<UserSettings>;
  save(raw: unknown): Promise<UserSettings>;
}

export interface DbService {
  query: Query;
  trips: TripsRepo;
  models: ModelsRepo;
  settings: SettingsRepo;
}
