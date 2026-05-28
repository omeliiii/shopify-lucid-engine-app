import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type {
  BillingCatalog,
  BillingSubscription,
  PlanType,
  CatalogPlan,
} from '../types/billingTypes';
import {
  fetchCatalog,
  fetchSubscription,
  checkout,
  upgrade,
  addAddon,
  changeSelectedCountry,
  cancelSubscription,
} from '../utils/billingApi';

// ── Helpers: App Bridge redirect ───────────────────────────────────────────────

/**
 * Redirect the top-level browser to `url`.
 * Inside Shopify admin → uses App Bridge `open()`.
 * In dev outside Shopify → falls back to `window.open()`.
 */
function redirectTopLevel(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shopify = (window as any).shopify;
  if (shopify) {
    // App Bridge v4: open() navigates the top frame
    window.open(url, '_top');
  } else {
    window.open(url, '_blank');
  }
}

// ── Context shape ──────────────────────────────────────────────────────────────

interface BillingContextValue {
  catalog: BillingCatalog | null;
  subscription: BillingSubscription | null;
  loading: boolean;
  error: string | null;

  /** True when the merchant must see the paywall (no active subscription). */
  isPaywallRequired: boolean;

  /** Re-fetch subscription state from the backend. */
  refreshSubscription: () => Promise<void>;

  /** Start checkout flow → redirect to Shopify. */
  redirectToCheckout: (plan: PlanType, selectedCountry?: string) => Promise<void>;

  /** Upgrade One → Multi → redirect to Shopify. */
  redirectToUpgrade: () => Promise<void>;

  /** Add extra country → redirect to Shopify. */
  redirectToAddon: (countryCode: string) => Promise<void>;

  /** Change selected country (One Country only). */
  changeCountry: (countryCode: string) => Promise<void>;

  /** Cancel subscription at period end. */
  cancel: () => Promise<void>;

  /** Get the CatalogPlan for a given PlanType. */
  getPlan: (plan: PlanType) => CatalogPlan | undefined;
}

const BillingContext = createContext<BillingContextValue | null>(null);

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within <BillingProvider>');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function BillingProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<BillingCatalog | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Initial load ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [cat, sub] = await Promise.all([fetchCatalog(), fetchSubscription()]);
        if (cancelled) return;
        setCatalog(cat);
        setSubscription(sub);
      } catch (e) {
        if (cancelled) return;
        console.error('[BillingProvider] init failed', e);
        setError('Failed to load billing data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Refresh subscription ──
  const refreshSubscription = useCallback(async () => {
    try {
      const sub = await fetchSubscription();
      setSubscription(sub);
    } catch (e) {
      console.error('[BillingProvider] refreshSubscription failed', e);
    }
  }, []);

  // ── Actions ──
  const redirectToCheckout = useCallback(async (plan: PlanType, selectedCountry?: string) => {
    const { confirmationUrl } = await checkout(plan, selectedCountry);
    redirectTopLevel(confirmationUrl);
  }, []);

  const redirectToUpgrade = useCallback(async () => {
    const { confirmationUrl } = await upgrade();
    redirectTopLevel(confirmationUrl);
  }, []);

  const redirectToAddon = useCallback(async (countryCode: string) => {
    const { confirmationUrl } = await addAddon(countryCode);
    redirectTopLevel(confirmationUrl);
  }, []);

  const changeCountry = useCallback(async (countryCode: string) => {
    await changeSelectedCountry(countryCode);
    await refreshSubscription();
  }, [refreshSubscription]);

  const cancel = useCallback(async () => {
    await cancelSubscription();
    await refreshSubscription();
  }, [refreshSubscription]);

  const getPlan = useCallback(
    (plan: PlanType) => catalog?.plans.find((p) => p.plan === plan),
    [catalog],
  );

  // ── Computed: paywall required? ──
  const isPaywallRequired = useMemo(() => {
    if (!subscription) return false; // still loading — don't flash paywall
    if (!subscription.hasSubscription) return true;
    const blocked: Array<string | null> = ['EXPIRED', 'DECLINED'];
    if (blocked.includes(subscription.status)) return true;
    return false;
  }, [subscription]);

  const value = useMemo<BillingContextValue>(
    () => ({
      catalog,
      subscription,
      loading,
      error,
      isPaywallRequired,
      refreshSubscription,
      redirectToCheckout,
      redirectToUpgrade,
      redirectToAddon,
      changeCountry,
      cancel,
      getPlan,
    }),
    [
      catalog, subscription, loading, error, isPaywallRequired,
      refreshSubscription, redirectToCheckout, redirectToUpgrade,
      redirectToAddon, changeCountry, cancel, getPlan,
    ],
  );

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}
