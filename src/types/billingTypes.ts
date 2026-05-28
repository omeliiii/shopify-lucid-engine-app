// ── Billing Types ──────────────────────────────────────────────────────────────

export type PlanType = 'ONE_COUNTRY' | 'MULTI_COUNTRY';

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'FROZEN'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DECLINED';

export type LockedReason =
  | 'TRIAL'
  | 'COUNTRY_NOT_INCLUDED'
  | 'EXPIRED'
  | 'NO_ACCESS';

// ── API Response shapes ────────────────────────────────────────────────────────

export interface CatalogPlan {
  plan: PlanType;
  name: string;
  amount: number;
  interval: 'ANNUAL';
}

export interface CatalogAddon {
  name: string;
  amount: number;
  interval: 'ANNUAL';
}

export interface BillingCatalog {
  currency: string;
  trialDays: number;
  plans: CatalogPlan[];
  addon: CatalogAddon;
}

export interface BillingSubscription {
  hasSubscription: boolean;
  plan: PlanType | null;
  status: SubscriptionStatus | null;
  isInTrial: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  selectedCountry: string | null;
  canChangeSelectedCountry: boolean;
  addonCountries: string[];
  accessibleCountries: string[];
  availableCountries: string[];
}

export interface BillingErrorDetails {
  reason?: string;
  [key: string]: unknown;
}

export interface BillingError {
  statusCode: number;
  error: string;
  message: string;
  details?: BillingErrorDetails;
}

export interface CheckoutResponse {
  confirmationUrl: string;
}

export interface ChangeCountryResponse {
  selectedCountry: string;
  selectedCountryLockedAt: string | null;
}

// ── Report entitlements (added to GET /reports response) ───────────────────────

export interface ReportEntitlements {
  canDownload: boolean;
  lockedReason: LockedReason | null;
}
