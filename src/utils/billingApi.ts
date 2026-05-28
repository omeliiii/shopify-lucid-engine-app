import { apiFetch } from './api';
import type {
  BillingCatalog,
  BillingSubscription,
  CheckoutResponse,
  ChangeCountryResponse,
  PlanType,
} from '../types/billingTypes';

// ── Billing API ────────────────────────────────────────────────────────────────

/** GET /billing/catalog — static plan catalog (cache-friendly). */
export async function fetchCatalog(): Promise<BillingCatalog> {
  return apiFetch('/billing/catalog');
}

/** GET /billing/subscription — current merchant subscription state. */
export async function fetchSubscription(): Promise<BillingSubscription> {
  return apiFetch('/billing/subscription');
}

/**
 * POST /billing/checkout — start a new subscription.
 * `selectedCountry` is REQUIRED when `plan === 'ONE_COUNTRY'`.
 */
export async function checkout(
  plan: PlanType,
  selectedCountry?: string,
): Promise<CheckoutResponse> {
  return apiFetch('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, ...(selectedCountry ? { selectedCountry } : {}) }),
  });
}

/** POST /billing/upgrade — upgrade One Country → Multi Country. */
export async function upgrade(): Promise<CheckoutResponse> {
  return apiFetch('/billing/upgrade', { method: 'POST' });
}

/** POST /billing/addons — add an extra country (One Country plan only). */
export async function addAddon(countryCode: string): Promise<CheckoutResponse> {
  return apiFetch('/billing/addons', {
    method: 'POST',
    body: JSON.stringify({ countryCode }),
  });
}

/** PATCH /billing/selected-country — change primary country. */
export async function changeSelectedCountry(
  countryCode: string,
): Promise<ChangeCountryResponse> {
  return apiFetch('/billing/selected-country', {
    method: 'PATCH',
    body: JSON.stringify({ countryCode }),
  });
}

/** POST /billing/cancel — cancel subscription at period end. */
export async function cancelSubscription(): Promise<void> {
  await apiFetch('/billing/cancel', { method: 'POST' });
}
