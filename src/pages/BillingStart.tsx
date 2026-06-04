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
  SkeletonPage,
  SkeletonBodyText,
  Layout,
} from '@shopify/polaris';
import { useTranslation, Trans } from 'react-i18next';
import { useBilling } from '../contexts/BillingProvider';
import { countryOptions } from '../utils/countries';
import type { PlanType } from '../types/billingTypes';

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
  const { catalog, subscription, loading, redirectToCheckout } = useBilling();
  const { t } = useTranslation('common');

  const [selectedCountry, setSelectedCountry] = useState('');
  const [submitting, setSubmitting] = useState<PlanType | null>(null);
  const [countryPopoverActive, setCountryPopoverActive] = useState(false);

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
  const addonAmount = catalog.addon.amount;

  const handleCheckout = async (plan: PlanType) => {
    setSubmitting(plan);
    try {
      await redirectToCheckout(plan, plan === 'ONE_COUNTRY' ? selectedCountry : undefined);
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

              <InlineStack gap="100" blockAlign="baseline">
                <Text as="span" variant="heading2xl">
                  {`${currency}${oneCountryPlan?.amount ?? 179}`}
                </Text>
                <Text as="span" tone="subdued">{t('billing.plans.one_country.amount_unit')}</Text>
              </InlineStack>

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

              <InlineStack gap="100" blockAlign="baseline">
                <Text as="span" variant="heading2xl">
                  {`${currency}${multiCountryPlan?.amount ?? 329}`}
                </Text>
                <Text as="span" tone="subdued">{t('billing.plans.multi_country.amount_unit')}</Text>
              </InlineStack>

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
