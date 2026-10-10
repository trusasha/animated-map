import type { CustomModel, LngLat, TripData, TripSummary, Trip, UserSettings } from '../../src/domain/types.ts';

export type Query = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;

/** the caller's user id; null is the single local user when auth is off */
export type Owner = string | null;

/** what Home needs per trip: no paths, no full data */
export interface TripListItem { id: string; title: string; updated_at: string; summary: TripSummary; points: LngLat[] }

export interface TripsRepo {
  list(owner: Owner): Promise<TripListItem[]>;
  get(owner: Owner, id: string): Promise<Trip | undefined>;
  create(owner: Owner, title: string, data: TripData): Promise<Trip>;
  update(owner: Owner, id: string, title: string, data: TripData): Promise<Trip | undefined>;
  remove(owner: Owner, id: string): Promise<void>;
}

export interface ModelsRepo {
  list(owner: Owner): Promise<CustomModel[]>;
  get(owner: Owner, id: string): Promise<CustomModel | undefined>;
  create(owner: Owner, m: Omit<CustomModel, 'id' | 'pose'>): Promise<CustomModel>;
  setState(owner: Owner, id: string, url: string | null, status: string): Promise<CustomModel>;
  edit(owner: Owner, id: string, m: Pick<CustomModel, 'name' | 'mode' | 'pose'>): Promise<CustomModel | undefined>;
  remove(owner: Owner, id: string): Promise<void>;
}

export interface SettingsRepo {
  get(owner: Owner): Promise<UserSettings>;
  save(owner: Owner, raw: unknown): Promise<UserSettings>;
}

export interface Claimed { trips: number; models: number; settings: number }

export interface ClaimRepo {
  /** who took the unowned rows, if anyone has */
  claimedBy(): Promise<string | null>;
  /** gives every unowned row to `owner`; only the first call ever does anything, later ones return null */
  claimLegacy(owner: string, label: string): Promise<Claimed | null>;
}

export interface DbService {
  query: Query;
  trips: TripsRepo;
  models: ModelsRepo;
  settings: SettingsRepo;
  claim: ClaimRepo;
}
