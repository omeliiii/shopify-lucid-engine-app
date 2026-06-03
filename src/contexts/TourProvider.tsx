import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchTourState, saveTourState, type TourStage, type TourStatus } from '../utils/tourApi';
import { useBilling } from './BillingProvider';

interface TourContextValue {
  /** True once we know the merchant's tour state. */
  ready: boolean;
  /** Current stage the merchant is on. */
  stage: TourStage;
  /** Lifecycle status of the tour. */
  status: TourStatus;
  /** True when Joyride should actually be rendering steps. */
  running: boolean;

  /** Start (or resume) the tour from the persisted stage. */
  start: () => void;
  /** Advance to a specific stage (persisted on the server). */
  goToStage: (stage: TourStage) => void;
  /** Pause the tour — will be re-offered on next session. */
  suspend: () => void;
  /** Permanently dismiss the tour. */
  dismissForever: () => void;
  /** Mark tour as fully completed. */
  complete: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within <TourProvider>');
  return ctx;
}

const STAGES: TourStage[] = ['welcome', 'inventory', 'mapping', 'shipping_rules', 'backfill', 'completed'];

export function TourProvider({ children }: { children: ReactNode }) {
  const { subscription, loading: billingLoading } = useBilling();
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<TourStage>('welcome');
  const [status, setStatus] = useState<TourStatus>('pending');
  const [running, setRunning] = useState(false);

  // Avoid double-auto-start within the same session
  const autoStartedRef = useRef(false);

  // Load initial state once billing has settled — the tour is only meant
  // for subscribed merchants (trial counts as subscribed).
  useEffect(() => {
    if (billingLoading) return;
    if (!subscription?.hasSubscription) {
      setReady(true);
      return;
    }
    let cancelled = false;
    fetchTourState().then((state) => {
      if (cancelled) return;
      setStage(state.stage);
      setStatus(state.status);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [billingLoading, subscription?.hasSubscription]);

  // Auto-start when the merchant has an unfinished, non-dismissed tour
  useEffect(() => {
    if (!ready || autoStartedRef.current) return;
    if (!subscription?.hasSubscription) return;
    if (status === 'pending' || status === 'suspended') {
      autoStartedRef.current = true;
      setRunning(true);
    }
  }, [ready, status, subscription?.hasSubscription]);

  const start = useCallback(() => {
    setRunning(true);
    if (status !== 'pending') {
      setStatus('pending');
      saveTourState({ status: 'pending' });
    }
  }, [status]);

  const goToStage = useCallback((next: TourStage) => {
    setStage(next);
    if (next === 'completed') {
      setStatus('completed');
      setRunning(false);
      saveTourState({ stage: next, status: 'completed' });
    } else {
      saveTourState({ stage: next });
    }
  }, []);

  const suspend = useCallback(() => {
    setStatus('suspended');
    setRunning(false);
    autoStartedRef.current = true;
    saveTourState({ status: 'suspended' });
  }, []);

  const dismissForever = useCallback(() => {
    setStatus('dismissed');
    setRunning(false);
    autoStartedRef.current = true;
    saveTourState({ status: 'dismissed' });
  }, []);

  const complete = useCallback(() => {
    setStage('completed');
    setStatus('completed');
    setRunning(false);
    saveTourState({ stage: 'completed', status: 'completed' });
  }, []);

  const value = useMemo<TourContextValue>(() => ({
    ready,
    stage,
    status,
    running,
    start,
    goToStage,
    suspend,
    dismissForever,
    complete,
  }), [ready, stage, status, running, start, goToStage, suspend, dismissForever, complete]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

/** Helper used by the Tour component to know what comes next. */
export function nextStage(current: TourStage): TourStage {
  const idx = STAGES.indexOf(current);
  if (idx === -1 || idx === STAGES.length - 1) return 'completed';
  return STAGES[idx + 1];
}
