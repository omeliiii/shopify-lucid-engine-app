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
  /** Active coupon discount, or `null` when no coupon was applied. */
  discount: SubscriptionDiscount | null;
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

// ── Coupons ──────────────────────────────────────────────────────────────────

export interface CouponPricing {
  amount: number;
  discountedAmount: number;
}

export interface ValidCoupon {
  code: string;
  valid: true;
  discountPercent: number;
  currency: string;
  plans: Record<PlanType, CouponPricing>;
  addon: CouponPricing;
  /**
   * How many annual intervals the discount applies for:
   * `1` → this payment only, `null` → forever (every renewal),
   * `5` → this payment plus 4 renewals (5 years total).
   */
  durationLimitIntervals: number | null;
}

export interface InvalidCoupon {
  code: string;
  valid: false;
  reason?: string;
}

export type CouponResponse = ValidCoupon | InvalidCoupon;

/**
 * Coupon discount currently applied to a subscription. Present on
 * {@link BillingSubscription.discount} only when the merchant subscribed with a
 * valid coupon. Field names mirror {@link ValidCoupon}/{@link CouponPricing}:
 * `amount` is the full plan price (struck-through) and `discountedAmount` the
 * amount charged for the current period.
 */
export interface SubscriptionDiscount extends CouponPricing {
  /** Coupon code that produced this discount. */
  code: string;
  /** Percentage off the plan price (e.g. `25` → 25% off). */
  discountPercent: number;
  /**
   * How many annual intervals the discount applies for:
   * `1` → this payment only, `null` → forever (every renewal),
   * `5` → this payment plus 4 renewals (5 years total).
   */
  durationLimitIntervals: number | null;
  /**
   * Amount that will be charged at the next renewal. Equals
   * {@link CouponPricing.discountedAmount} while the discount still covers the
   * next period, otherwise reverts to {@link CouponPricing.amount}.
   */
  renewalAmount: number;
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
