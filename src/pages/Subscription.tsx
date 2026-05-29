import { useState, useMemo } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
  Tag,
  Select,
  Modal,
  Banner,
  Box,
  Tooltip,
  SkeletonPage,
  SkeletonBodyText,
} from '@shopify/polaris';
import { useBilling } from '../contexts/BillingProvider';
import { countryDisplay, countryFlag, countryLabel, countryOptions } from '../utils/countries';
import type { SubscriptionStatus } from '../types/billingTypes';
import { isBillingError } from '../utils/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function statusBadge(
  status: SubscriptionStatus | null,
  isInTrial: boolean,
  trialEndsAt: string | null,
  currentPeriodEnd: string | null,
) {
  if (!status) return <Badge>Unknown</Badge>;

  if (status === 'ACTIVE' && isInTrial && trialEndsAt) {
    const days = daysUntil(trialEndsAt);
    return <Badge tone="info">{`Trial (${days} day${days !== 1 ? 's' : ''} left)`}</Badge>;
  }
  if (status === 'ACTIVE') {
    return <Badge tone="success">Active</Badge>;
  }
  if (status === 'CANCELLED' && currentPeriodEnd && new Date(currentPeriodEnd) > new Date()) {
    return <Badge tone="warning">{`Cancelled — access until ${formatDate(currentPeriodEnd)}`}</Badge>;
  }
  if (status === 'EXPIRED') {
    return <Badge tone="critical">Expired</Badge>;
  }
  if (status === 'PENDING') {
    return <Badge>Awaiting confirmation</Badge>;
  }
  if (status === 'DECLINED') {
    return <Badge tone="critical">Declined</Badge>;
  }
  return <Badge>{status}</Badge>;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Subscription() {
  const {
    catalog,
    subscription: sub,
    loading,
    changeCountry,
    redirectToAddon,
    redirectToUpgrade,
    cancel,
    redirectToEndTrial,
    getPlan,
    refreshSubscription,
  } = useBilling();

  // ── Local UI state ──
  const [changeCountryOpen, setChangeCountryOpen] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [changingCountry, setChangingCountry] = useState(false);

  const [addonOpen, setAddonOpen] = useState(false);
  const [addonCountry, setAddonCountry] = useState('');
  const [addingAddon, setAddingAddon] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [endingTrial, setEndingTrial] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shopify = typeof window !== 'undefined' ? (window as any).shopify : null;
  const showToast = (msg: string, opts?: { isError?: boolean }) => {
    if (shopify?.toast) shopify.toast.show(msg, opts);
  };

  // ── Derived ──
  const isOneCountry = sub?.plan === 'ONE_COUNTRY';
  const planInfo = sub?.plan ? getPlan(sub.plan) : null;

  // Available countries for add-on (exclude already selected + already added)
  const addonAvailable = useMemo(() => {
    if (!sub) return [];
    return (sub.availableCountries ?? []).filter(
      (c) => c !== sub.selectedCountry && !sub.addonCountries.includes(c),
    );
  }, [sub]);

  // Change-country options (from availableCountries, excluding current)
  const changeCountryOpts = useMemo(() => {
    if (!sub) return [];
    return countryOptions(
      (sub.availableCountries ?? []).filter((c) => c !== sub.selectedCountry),
    );
  }, [sub]);

  // ── Loading state ──
  if (loading || !sub || !catalog) {
    return (
      <SkeletonPage title="Subscription">
        <Layout>
          <Layout.Section><Card><SkeletonBodyText lines={6} /></Card></Layout.Section>
          <Layout.Section><Card><SkeletonBodyText lines={4} /></Card></Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  // ── Handlers ──
  const handleChangeCountry = async () => {
    setChangingCountry(true);
    try {
      await changeCountry(newCountry);
      showToast(`Country changed to ${countryLabel(newCountry)}`);
      setChangeCountryOpen(false);
      setNewCountry('');
    } catch (e) {
      if (isBillingError(e) && e.error === 'COUNTRY_LOCKED') {
        showToast(
          `Cannot change country until next renewal (${formatDate(sub.currentPeriodEnd)})`,
          { isError: true },
        );
      } else if (isBillingError(e) && e.error === 'COUNTRY_NOT_SUPPORTED') {
        showToast('Country not available', { isError: true });
      } else {
        showToast('Something went wrong', { isError: true });
      }
    } finally {
      setChangingCountry(false);
    }
  };

  const handleAddAddon = async () => {
    setAddingAddon(true);
    try {
      await redirectToAddon(addonCountry);
    } catch (e) {
      console.error('[Subscription] addon failed', e);
      showToast('Something went wrong', { isError: true });
    } finally {
      setAddingAddon(false);
      setAddonOpen(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      await redirectToUpgrade();
    } catch (e) {
      console.error('[Subscription] upgrade failed', e);
      showToast('Something went wrong', { isError: true });
    }
  };

  const handleEndTrial = async () => {
    setEndingTrial(true);
    try {
      await redirectToEndTrial();
    } catch (e) {
      console.error('[Subscription] endTrial failed', e);
      showToast('Something went wrong', { isError: true });
      setEndingTrial(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancel();
      showToast(`Your subscription will end on ${formatDate(sub.currentPeriodEnd)}`);
      setCancelOpen(false);
      await refreshSubscription();
    } catch (e) {
      if (isBillingError(e)) {
        showToast(e.message, { isError: true });
      } else {
        showToast('Something went wrong', { isError: true });
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Page title="Subscription" narrowWidth>
      <Layout>
        {/* ── Header: Plan + Status ── */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">
                  {planInfo?.name ?? sub.plan ?? 'No plan'}
                </Text>
                {statusBadge(sub.status, sub.isInTrial, sub.trialEndsAt, sub.currentPeriodEnd)}
              </InlineStack>

              <InlineStack gap="100" blockAlign="baseline">
                <Text as="span" variant="headingXl">
                  {`$${planInfo?.amount ?? '—'}`}
                </Text>
                <Text as="span" tone="subdued">/year</Text>
              </InlineStack>

              {sub.isInTrial && sub.trialEndsAt && (
                <Banner tone="info">
                  <BlockStack gap="300">
                    <p>
                      You're on a free trial until <strong>{formatDate(sub.trialEndsAt)}</strong>.
                      Report downloads are available after the trial ends.
                    </p>
                    <Box>
                      <Button
                        variant="primary"
                        loading={endingTrial}
                        onClick={handleEndTrial}
                      >
                        End trial and activate payment
                      </Button>
                    </Box>
                  </BlockStack>
                </Banner>
              )}

              {sub.currentPeriodEnd && sub.status !== 'CANCELLED' && (
                <Text as="p" tone="subdued">
                  Renews on {formatDate(sub.currentPeriodEnd)}
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* ── Country Section (One Country only) ── */}
        {isOneCountry && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Selected Country</Text>

                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" variant="headingLg">
                    {sub.selectedCountry
                      ? countryDisplay(sub.selectedCountry)
                      : 'No country selected'}
                  </Text>

                  {sub.canChangeSelectedCountry ? (
                    <Button
                      size="slim"
                      onClick={() => setChangeCountryOpen(true)}
                    >
                      Change
                    </Button>
                  ) : (
                    <Tooltip content={`Country locked until renewal (${formatDate(sub.currentPeriodEnd)})`}>
                      <Badge>Locked</Badge>
                    </Tooltip>
                  )}
                </InlineStack>

                <Divider />

                {/* Add-on countries */}
                <Text as="h3" variant="headingSm">Extra Countries</Text>

                {sub.addonCountries.length > 0 ? (
                  <InlineStack gap="200">
                    {sub.addonCountries.map((c) => (
                      <Tag key={c}>{countryFlag(c)} {countryLabel(c)}</Tag>
                    ))}
                  </InlineStack>
                ) : (
                  <Text as="p" tone="subdued">No extra countries yet.</Text>
                )}

                {addonAvailable.length > 0 && (
                  <Button onClick={() => setAddonOpen(true)}>
                  {`Add another country ($${catalog.addon.amount}/year)`}
                  </Button>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* ── Upgrade Section (One Country only) ── */}
        {isOneCountry && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Upgrade to Multi Country
                </Text>
                <Text as="p" tone="subdued">
                  Get unlimited access to all countries for ${getPlan('MULTI_COUNTRY')?.amount ?? 329}/year.
                  Prorated billing handled by Shopify — upgrade mid-cycle anytime.
                </Text>
                <Box>
                  <Button variant="primary" onClick={handleUpgrade}>
                    Upgrade now
                  </Button>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* ── Danger Zone ── */}
        {sub.status === 'ACTIVE' && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd" tone="critical">
                  Danger Zone
                </Text>
                <Text as="p" tone="subdued">
                  Cancel your subscription. You'll retain access until the end of your current
                  billing period ({formatDate(sub.currentPeriodEnd)}).
                </Text>
                <Box>
                  <Button tone="critical" onClick={() => setCancelOpen(true)}>
                    Cancel subscription
                  </Button>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>

      {/* ── Modal: Change Country ── */}
      <Modal
        open={changeCountryOpen}
        onClose={() => setChangeCountryOpen(false)}
        title="Change selected country"
        primaryAction={{
          content: 'Confirm change',
          onAction: handleChangeCountry,
          loading: changingCountry,
          disabled: !newCountry,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setChangeCountryOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              Your current country is <strong>{sub.selectedCountry ? countryDisplay(sub.selectedCountry) : '—'}</strong>.
              Choose a new primary country below.
            </Text>
            <Select
              label="New country"
              options={[{ label: 'Choose…', value: '' }, ...changeCountryOpts]}
              value={newCountry}
              onChange={setNewCountry}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ── Modal: Add Country Add-on ── */}
      <Modal
        open={addonOpen}
        onClose={() => setAddonOpen(false)}
        title="Add extra country"
        primaryAction={{
          content: `Add country ($${catalog.addon.amount}/year)`,
          onAction: handleAddAddon,
          loading: addingAddon,
          disabled: !addonCountry,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setAddonOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              Add an extra country to your One Country plan for ${catalog.addon.amount}/year.
              This add-on renews automatically with your main subscription.
            </Text>
            <Select
              label="Country to add"
              options={[
                { label: 'Choose…', value: '' },
                ...countryOptions(addonAvailable),
              ]}
              value={addonCountry}
              onChange={setAddonCountry}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ── Modal: Cancel Confirmation ── */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel subscription?"
        primaryAction={{
          content: 'Yes, cancel',
          onAction: handleCancel,
          loading: cancelling,
          destructive: true,
        }}
        secondaryActions={[{ content: 'Keep subscription', onAction: () => setCancelOpen(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            Your access will continue until <strong>{formatDate(sub.currentPeriodEnd)}</strong>.
            After that, all features will be locked. You can resubscribe at any time.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
