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
import { useBilling } from '../contexts/BillingProvider';
import { countryOptions } from '../utils/countries';
import type { PlanType } from '../types/billingTypes';

// ── Feature lists ──────────────────────────────────────────────────────────────

const ONE_COUNTRY_FEATURES = [
  'Dashboard & order tracking',
  'Packaging inventory management',
  'AI-powered product mapping',
  'Shipping rules engine',
  'Automated report generation',
  '1 country for export & dashboard',
  'Add extra countries at $99/year each',
];

const MULTI_COUNTRY_FEATURES = [
  'Everything in Basic, plus:',
  'All available countries included',
  'No per-country add-on fees',
  'Unlimited country switching',
  'Best value for multi-market sellers',
];

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

  const [selectedCountry, setSelectedCountry] = useState('');
  const [submitting, setSubmitting] = useState<PlanType | null>(null);
  const [countryPopoverActive, setCountryPopoverActive] = useState(false);

  if (loading || !catalog) {
    return (
      <SkeletonPage title="Choose your plan">
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

  const handleCheckout = async (plan: PlanType) => {
    setSubmitting(plan);
    try {
      await redirectToCheckout(plan, plan === 'ONE_COUNTRY' ? selectedCountry : undefined);
    } catch (e) {
      console.error('[BillingStart] checkout failed', e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shopify = (window as any).shopify;
      if (shopify?.toast) {
        shopify.toast.show('Something went wrong. Please try again.', { isError: true });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const ctaLabel = showTrialBadge ? `Start ${trialDays}-day free trial` : 'Subscribe now';

  return (
    <Page title="Choose your plan">
      <BlockStack gap="600">
        {showTrialBadge && (
          <Banner tone="info">
            <p>
              Start with a <strong>{trialDays}-day free trial</strong> — full access to all
              features. Report downloads are available after the trial ends.
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
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">Basic</Text>
                {showTrialBadge && <Badge tone="info">{`${trialDays}-day trial`}</Badge>}
              </InlineStack>

              <InlineStack gap="100" blockAlign="baseline">
                <Text as="span" variant="heading2xl">
                  {`$${oneCountryPlan?.amount ?? 179}`}
                </Text>
                <Text as="span" tone="subdued">/year</Text>
              </InlineStack>

              <Divider />

              <BlockStack gap="200">
                {ONE_COUNTRY_FEATURES.map((f) => (
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
                  <Text as="p" variant="bodyMd" fontWeight="medium">Select your country</Text>
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
                          ? countries.find((c) => c.value === selectedCountry)?.label
                          : 'Choose a country…'}
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
                    This country will be locked until your annual renewal.
                  </Text>
                </BlockStack>
                <Tooltip
                  content={!selectedCountry ? 'Select a country first' : ''}
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
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">Unlimited ✨</Text>
                <InlineStack gap="200">
                  {showTrialBadge && <Badge tone="info">{`${trialDays}-day trial`}</Badge>}
                  <Badge tone="success">Best value</Badge>
                </InlineStack>
              </InlineStack>

              <InlineStack gap="100" blockAlign="baseline">
                <Text as="span" variant="heading2xl">
                  {`$${multiCountryPlan?.amount ?? 329}`}
                </Text>
                <Text as="span" tone="subdued">/year</Text>
              </InlineStack>

              <Divider />

              <BlockStack gap="200">
                {MULTI_COUNTRY_FEATURES.map((f) => (
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
                    Your trial has already been used. You'll be charged immediately.
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
