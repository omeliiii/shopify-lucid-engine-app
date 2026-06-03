import { apiFetch } from './api';
import { shopKey } from './storage';

export type TourStage =
  | 'welcome'
  | 'inventory'
  | 'mapping'
  | 'shipping_rules'
  | 'backfill'
  | 'completed';

export type TourStatus = 'pending' | 'suspended' | 'dismissed' | 'completed';

export interface TourState {
  status: TourStatus;
  stage: TourStage;
}

const LS_KEY = shopKey('onboarding_tour_state');
const DEFAULT_STATE: TourState = { status: 'pending', stage: 'welcome' };

function readLocal(): TourState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TourState>;
    if (!parsed.status || !parsed.stage) return null;
    return { status: parsed.status as TourStatus, stage: parsed.stage as TourStage };
  } catch {
    return null;
  }
}

function writeLocal(state: TourState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/**
 * Read tour state from backend, falling back to localStorage when the
 * endpoint isn't available yet (e.g. backend hasn't shipped the route).
 */
export async function fetchTourState(): Promise<TourState> {
  try {
    const data = (await apiFetch('/onboarding/tour')) as Partial<TourState> | undefined;
    if (data && typeof data === 'object' && data.status && data.stage) {
      const next: TourState = { status: data.status, stage: data.stage };
      writeLocal(next);
      return next;
    }
  } catch (err) {
    // Backend not ready or network error — fall back to local cache
    console.warn('[tourApi] fetch failed, using local cache', err);
  }
  return readLocal() ?? DEFAULT_STATE;
}

/**
 * Persist tour state to backend, with an immediate local-write so the UI
 * stays consistent even if the request fails.
 */
export async function saveTourState(state: Partial<TourState>): Promise<TourState> {
  const current = readLocal() ?? DEFAULT_STATE;
  const next: TourState = { ...current, ...state };
  writeLocal(next);

  try {
    await apiFetch('/onboarding/tour', {
      method: 'PATCH',
      body: JSON.stringify(next),
    });
  } catch (err) {
    console.warn('[tourApi] save failed (kept locally)', err);
  }
  return next;
}
