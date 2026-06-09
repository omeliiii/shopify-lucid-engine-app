import { useState } from 'react';
import {
  Page,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
  Popover,
  ActionList,
  Banner,
  Box,
  Tooltip,
  TextField,
  SkeletonPage,
  SkeletonBodyText,
  Layout,
} from '@shopify/polaris';
import { useTranslation, Trans } from 'react-i18next';
import { useBilling } from '../contexts/BillingProvider';
import { countryOptions } from '../utils/countries';
import type { PlanType, ValidCoupon } from '../types/billingTypes';

// ── Shared card box style ──────────────────────────────────────────────────────

const cardStyle = (gradient: boolean): React.CSSProperties => ({
  borderRadius: '12px',
  padding: '24px',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08)',
  ...(gradient
    ? {
        background:
          'linear-gradient(var(--p-color-bg-surface), var(--p-color-bg-surface)) padding-box,' +
          'linear-gradient(135deg, #FF6B6B 0%, #5562EA 50%, #4ECDC4 100%) border-box',
        border: '2px solid transparent',
        backgroundColor: 'var(--p-color-bg-surface)',
      }
    : {
        border: '1px solid var(--p-color-border)',
        backgroundColor: 'var(--p-color-bg-surface)',
      }),
});

// ── Component ──────────────────────────────────────────────────────────────────

export default function BillingStart() {
  const { catalog, subscription, loading, redirectToCheckout, validateCoupon } = useBilling();
  const { t } = useTranslation('common');

  const [selectedCountry, setSelectedCountry] = useState('');
  const [submitting, setSubmitting] = useState<PlanType | null>(null);
  const [countryPopoverActive, setCountryPopoverActive] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<ValidCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  if (loading || !catalog) {
    return (
      <SkeletonPage title={t('billing.plan_selection.page_title')}>
        <Layout>
          <Layout.Section variant="oneHalf"><SkeletonBodyText lines={10} /></Layout.Section>
          <Layout.Section variant="oneHalf"><SkeletonBodyText lines={10} /></Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const hasUsedTrial =
    subscription?.trialEndsAt !== null && subscription?.trialEndsAt !== undefined;
  const trialDays = catalog.trialDays;
  const showTrialBadge = trialDays > 0 && !hasUsedTrial;

  const oneCountryPlan = catalog.plans.find((p) => p.plan === 'ONE_COUNTRY');
  const multiCountryPlan = catalog.plans.find((p) => p.plan === 'MULTI_COUNTRY');
  const countries = countryOptions(subscription?.availableCountries ?? ['DE', 'IT', 'FR']);
  const currency = catalog.currency === 'USD' ? '$' : catalog.currency;

  // Coupon-aware pricing — fall back to catalog amounts when no coupon applied.
  const oneCountryBase = oneCountryPlan?.amount ?? 179;
  const multiCountryBase = multiCountryPlan?.amount ?? 329;
  const oneCountryDiscounted = appliedCoupon?.plans.ONE_COUNTRY.discountedAmount;
  const multiCountryDiscounted = appliedCoupon?.plans.MULTI_COUNTRY.discountedAmount;
  const addonAmount = appliedCoupon ? appliedCoupon.addon.discountedAmount : catalog.addon.amount;

  const handleCheckout = async (plan: PlanType) => {
    setSubmitting(plan);
    try {
      await redirectToCheckout(
        plan,
        plan === 'ONE_COUNTRY' ? selectedCountry : undefined,
        appliedCoupon?.code,
      );
    } catch (e) {
      console.error('[BillingStart] checkout failed', e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shopify = (window as any).shopify;
      if (shopify?.toast) {
        shopify.toast.show(t('billing.plan_selection.checkout_failed'), { isError: true });
      }
    } finally {
      setSubmitting(null);
    }
  };

  // Maps the backend's English reason strings to localized messages.
  const couponErrorMessage = (reason?: string): string => {
    switch (reason) {
      case 'Coupon code not found':
        return t('billing.plan_selection.coupon_error_not_found');
      case 'Coupon is not yet valid':
        return t('billing.plan_selection.coupon_error_not_yet_valid');
      case 'Coupon has expired':
        return t('billing.plan_selection.coupon_error_expired');
      case 'Coupon is not valid for this merchant':
        return t('billing.plan_selection.coupon_error_wrong_merchant');
      case 'Coupon usage limit reached':
        return t('billing.plan_selection.coupon_error_usage_limit');
      default:
        return t('billing.plan_selection.coupon_invalid');
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(code);
      if (res.valid) {
        setAppliedCoupon(res);
      } else {
        setAppliedCoupon(null);
        setCouponError(couponErrorMessage(res.reason));
      }
    } catch (e) {
      console.error('[BillingStart] coupon validation failed', e);
      setAppliedCoupon(null);
      setCouponError(t('billing.plan_selection.coupon_invalid'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const couponDurationNote = (coupon: ValidCoupon): string => {
    if (coupon.durationLimitIntervals === null) {
      return t('billing.plan_selection.coupon_duration_forever');
    }
    if (coupon.durationLimitIntervals === 1) {
      return t('billing.plan_selection.coupon_duration_once');
    }
    return t('billing.plan_selection.coupon_duration_years', {
      years: coupon.durationLimitIntervals,
    });
  };

  const renderPrice = (base: number, discounted: number | undefined, unit: string) => (
    <InlineStack gap="200" blockAlign="baseline">
      {discounted !== undefined ? (
        <>
          <Text as="span" variant="heading2xl">{`${currency}${discounted}`}</Text>
          <Text as="span" tone="subdued" textDecorationLine="line-through">
            {`${currency}${base}`}
          </Text>
        </>
      ) : (
        <Text as="span" variant="heading2xl">{`${currency}${base}`}</Text>
      )}
      <Text as="span" tone="subdued">{unit}</Text>
    </InlineStack>
  );

  const ctaLabel = showTrialBadge
    ? t('billing.plan_selection.cta_start_trial', { days: trialDays })
    : t('billing.plan_selection.cta_subscribe_now');

  const oneCountryFeatures = t('billing.plans.one_country.features', {
    currency,
    amount: addonAmount,
    returnObjects: true,
  }) as unknown as string[];

  const multiCountryFeatures = t('billing.plans.multi_country.features', {
    returnObjects: true,
  }) as unknown as string[];

  return (
    <Page title={t('billing.plan_selection.page_title')}>
      <BlockStack gap="600">
        {showTrialBadge && (
          <Banner tone="info">
            <p>
              <Trans
                ns="common"
                i18nKey="billing.plan_selection.trial_banner"
                values={{ days: trialDays }}
                components={{ strong: <strong /> }}
              />
            </p>
          </Banner>
        )}

        {/* ── Coupon code (optional) ── */}
        <Box maxWidth="420px">
          <BlockStack gap="200">
            <TextField
              label={t('billing.plan_selection.coupon_label')}
              value={couponInput}
              onChange={(v) => {
                setCouponInput(v);
                if (couponError) setCouponError(null);
              }}
              placeholder={t('billing.plan_selection.coupon_placeholder')}
              autoComplete="off"
              disabled={appliedCoupon !== null || couponLoading}
              error={couponError ?? undefined}
              connectedRight={
                appliedCoupon !== null ? (
                  <Button onClick={handleRemoveCoupon}>
                    {t('billing.plan_selection.coupon_remove')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleApplyCoupon}
                    loading={couponLoading}
                    disabled={!couponInput.trim()}
                  >
                    {t('billing.plan_selection.coupon_apply')}
                  </Button>
                )
              }
            />
            {appliedCoupon !== null && (
              <Banner tone="success">
                <BlockStack gap="050">
                  <Text as="span">
                    {t('billing.plan_selection.coupon_applied', {
                      code: appliedCoupon.code,
                      percent: appliedCoupon.discountPercent,
                    })}
                  </Text>
                  <Text as="span" tone="subdued" variant="bodySm">
                    {couponDurationNote(appliedCoupon)}
                  </Text>
                </BlockStack>
              </Banner>
            )}
          </BlockStack>
        </Box>

        {/* Equal-height two-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {/* ── Basic ── */}
          <div style={cardStyle(false)}>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h2" variant="headingLg">{t('billing.plans.one_country.name')}</Text>
                <div style={{ minHeight: '28px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {showTrialBadge && <Badge tone="info">{t('billing.plan_selection.trial_badge', { days: trialDays })}</Badge>}
                </div>
              </BlockStack>

              {renderPrice(
                oneCountryBase,
                oneCountryDiscounted,
                t('billing.plans.one_country.amount_unit'),
              )}

              <Divider />

              <BlockStack gap="200">
                {oneCountryFeatures.map((f) => (
                  <InlineStack gap="200" key={f} blockAlign="start">
                    <Text as="span" tone="success">✓</Text>
                    <Text as="span">{f}</Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </BlockStack>

            {/* Bottom-anchored actions */}
            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <BlockStack gap="300">
                <Divider />
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="medium">{t('billing.plan_selection.country_picker_label')}</Text>
                  <Popover
                    active={countryPopoverActive}
                    fullWidth
                    onClose={() => setCountryPopoverActive(false)}
                    activator={
                      <Button
                        onClick={() => setCountryPopoverActive((a) => !a)}
                        disclosure
                        fullWidth
                        textAlign="left"
                      >
                        {selectedCountry
                          ? countries.find((c) => c.value === selectedCountry)?.label ?? t('billing.plan_selection.country_picker_placeholder')
                          : t('billing.plan_selection.country_picker_placeholder')}
                      </Button>
                    }
                  >
                    <ActionList
                      items={countries.map((c) => ({
                        content: c.label,
                        active: c.value === selectedCountry,
                        onAction: () => {
                          setSelectedCountry(c.value);
                          setCountryPopoverActive(false);
                        },
                      }))}
                    />
                  </Popover>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {t('billing.plan_selection.country_lock_note')}
                  </Text>
                </BlockStack>
                <Tooltip
                  content={!selectedCountry ? t('billing.plan_selection.country_picker_tooltip') : ''}
                  dismissOnMouseOut
                >
                  <Box>
                    <Button
                      variant="primary"
                      size="large"
                      fullWidth
                      disabled={!selectedCountry || submitting !== null}
                      loading={submitting === 'ONE_COUNTRY'}
                      onClick={() => handleCheckout('ONE_COUNTRY')}
                    >
                      {ctaLabel}
                    </Button>
                  </Box>
                </Tooltip>
              </BlockStack>
            </div>
          </div>

          {/* ── Unlimited ── */}
          <div style={cardStyle(true)}>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h2" variant="headingLg">{t('billing.plans.multi_country.name')} ✨</Text>
                <div style={{ minHeight: '28px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {showTrialBadge && <Badge tone="info">{t('billing.plan_selection.trial_badge', { days: trialDays })}</Badge>}
                  <Badge tone="success">{t('billing.plans.multi_country.best_value_badge')}</Badge>
                </div>
              </BlockStack>

              {renderPrice(
                multiCountryBase,
                multiCountryDiscounted,
                t('billing.plans.multi_country.amount_unit'),
              )}

              <Divider />

              <BlockStack gap="200">
                {multiCountryFeatures.map((f) => (
                  <InlineStack gap="200" key={f} blockAlign="start">
                    <Text as="span" tone="success">✓</Text>
                    <Text as="span">{f}</Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </BlockStack>

            {/* Bottom-anchored actions */}
            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <BlockStack gap="300">
                <Divider />
                <Button
                  variant="primary"
                  tone="success"
                  size="large"
                  fullWidth
                  disabled={submitting !== null}
                  loading={submitting === 'MULTI_COUNTRY'}
                  onClick={() => handleCheckout('MULTI_COUNTRY')}
                >
                  {ctaLabel}
                </Button>
                {!showTrialBadge && (
                  <Text as="p" tone="subdued" variant="bodySm" alignment="center">
                    {t('billing.plan_selection.no_trial_note')}
                  </Text>
                )}
              </BlockStack>
            </div>
          </div>
        </div>
      </BlockStack>
    </Page>
  );
}
