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
import { useTranslation, Trans } from 'react-i18next';
import { useBilling } from '../contexts/BillingProvider';
import { countryDisplay, countryFlag, countryLabel, countryOptions } from '../utils/countries';
import type { SubscriptionStatus } from '../types/billingTypes';
import { isBillingError } from '../utils/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
  const { t, i18n } = useTranslation('common');
  const dateLocale = i18n.language?.startsWith('en') ? 'en-GB' : `${i18n.language || 'it'}-${(i18n.language || 'it').toUpperCase()}`;

  const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderStatusBadge = (
    status: SubscriptionStatus | null,
    isInTrial: boolean,
    trialEndsAt: string | null,
    currentPeriodEnd: string | null,
  ) => {
    if (!status) return <Badge>{t('billing.subscription_status.unknown')}</Badge>;

    if (status === 'ACTIVE' && isInTrial && trialEndsAt) {
      const days = daysUntil(trialEndsAt);
      return (
        <Badge tone="info">
          {days === 1
            ? t('billing.subscription_status.trial_one')
            : t('billing.subscription_status.trial', { days })}
        </Badge>
      );
    }
    if (status === 'ACTIVE') {
      return <Badge tone="success">{t('billing.subscription_status.active')}</Badge>;
    }
    if (status === 'CANCELLED' && currentPeriodEnd && new Date(currentPeriodEnd) > new Date()) {
      return <Badge tone="warning">{t('billing.subscription_status.cancelled_until', { date: formatDate(currentPeriodEnd) })}</Badge>;
    }
    if (status === 'EXPIRED') {
      return <Badge tone="critical">{t('billing.subscription_status.expired')}</Badge>;
    }
    if (status === 'PENDING') {
      return <Badge>{t('billing.subscription_status.pending')}</Badge>;
    }
    if (status === 'DECLINED') {
      return <Badge tone="critical">{t('billing.subscription_status.declined')}</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

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
      <SkeletonPage title={t('billing.subscription_page.title')}>
        <Layout>
          <Layout.Section><Card><SkeletonBodyText lines={6} /></Card></Layout.Section>
          <Layout.Section><Card><SkeletonBodyText lines={4} /></Card></Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const currency = catalog.currency === 'USD' ? '$' : catalog.currency;
  const addonAmount = catalog.addon.amount;
  const multiAmount = getPlan('MULTI_COUNTRY')?.amount ?? 329;

  // ── Handlers ──
  const handleChangeCountry = async () => {
    setChangingCountry(true);
    try {
      await changeCountry(newCountry);
      showToast(t('billing.modals.change_country.toast_changed', { country: countryLabel(newCountry) }));
      setChangeCountryOpen(false);
      setNewCountry('');
    } catch (e) {
      if (isBillingError(e) && e.error === 'COUNTRY_LOCKED') {
        showToast(
          t('billing.modals.change_country.toast_locked', { date: formatDate(sub.currentPeriodEnd) }),
          { isError: true },
        );
      } else if (isBillingError(e) && e.error === 'COUNTRY_NOT_SUPPORTED') {
        showToast(t('billing.modals.change_country.toast_unsupported'), { isError: true });
      } else {
        showToast(t('billing.modals.change_country.toast_failed'), { isError: true });
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
      showToast(t('billing.modals.addon.toast_failed'), { isError: true });
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
      showToast(t('billing.modals.upgrade.toast_failed'), { isError: true });
    }
  };

  const handleEndTrial = async () => {
    setEndingTrial(true);
    try {
      await redirectToEndTrial();
    } catch (e) {
      console.error('[Subscription] endTrial failed', e);
      showToast(t('billing.modals.end_trial.toast_failed'), { isError: true });
      setEndingTrial(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancel();
      showToast(t('billing.modals.cancel.toast_confirmed', { date: formatDate(sub.currentPeriodEnd) }));
      setCancelOpen(false);
      await refreshSubscription();
    } catch (e) {
      if (isBillingError(e)) {
        showToast(e.message, { isError: true });
      } else {
        showToast(t('billing.modals.cancel.toast_failed'), { isError: true });
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Page title={t('billing.subscription_page.title')} narrowWidth>
      <Layout>
        {/* ── Header: Plan + Status ── */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">
                  {planInfo?.name ?? sub.plan ?? t('billing.subscription_page.no_plan')}
                </Text>
                {renderStatusBadge(sub.status, sub.isInTrial, sub.trialEndsAt, sub.currentPeriodEnd)}
              </InlineStack>

              <InlineStack gap="100" blockAlign="baseline">
                <Text as="span" variant="headingXl">
                  {`${currency}${planInfo?.amount ?? '—'}`}
                </Text>
                <Text as="span" tone="subdued">{t('billing.plans.one_country.amount_unit')}</Text>
              </InlineStack>

              {sub.isInTrial && sub.trialEndsAt && (
                <Banner tone="info">
                  <BlockStack gap="300">
                    <p>
                      <Trans
                        ns="common"
                        i18nKey="billing.subscription_page.trial_banner_body"
                        values={{ date: formatDate(sub.trialEndsAt) }}
                        components={{ strong: <strong /> }}
                      />
                    </p>
                    <Box>
                      <Button
                        variant="primary"
                        loading={endingTrial}
                        onClick={handleEndTrial}
                      >
                        {t('billing.subscription_page.end_trial_cta')}
                      </Button>
                    </Box>
                  </BlockStack>
                </Banner>
              )}

              {sub.currentPeriodEnd && sub.status !== 'CANCELLED' && (
                <Text as="p" tone="subdued">
                  {t('billing.subscription_page.renews_on', { date: formatDate(sub.currentPeriodEnd) })}
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
                <Text as="h2" variant="headingMd">{t('billing.subscription_page.selected_country_title')}</Text>

                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" variant="headingLg">
                    {sub.selectedCountry
                      ? countryDisplay(sub.selectedCountry)
                      : t('billing.subscription_page.no_country_selected')}
                  </Text>

                  {sub.canChangeSelectedCountry ? (
                    <Button
                      size="slim"
                      onClick={() => setChangeCountryOpen(true)}
                    >
                      {t('billing.subscription_page.change_country_cta')}
                    </Button>
                  ) : (
                    <Tooltip content={t('billing.subscription_page.country_locked_tooltip', { date: formatDate(sub.currentPeriodEnd) })}>
                      <Badge>{t('billing.subscription_page.country_locked_badge')}</Badge>
                    </Tooltip>
                  )}
                </InlineStack>

                <Divider />

                {/* Add-on countries */}
                <Text as="h3" variant="headingSm">{t('billing.subscription_page.extra_countries_title')}</Text>

                {sub.addonCountries.length > 0 ? (
                  <InlineStack gap="200">
                    {sub.addonCountries.map((c) => (
                      <Tag key={c}>{countryFlag(c)} {countryLabel(c)}</Tag>
                    ))}
                  </InlineStack>
                ) : (
                  <Text as="p" tone="subdued">{t('billing.subscription_page.no_extra_countries')}</Text>
                )}

                {addonAvailable.length > 0 && (
                  <Button onClick={() => setAddonOpen(true)}>
                    {t('billing.subscription_page.add_country_cta', { currency, amount: addonAmount })}
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
                  {t('billing.subscription_page.upgrade_title')}
                </Text>
                <Text as="p" tone="subdued">
                  {t('billing.subscription_page.upgrade_body', { currency, amount: multiAmount })}
                </Text>
                <Box>
                  <Button variant="primary" onClick={handleUpgrade}>
                    {t('billing.subscription_page.upgrade_cta')}
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
                  {t('billing.subscription_page.danger_zone_title')}
                </Text>
                <Text as="p" tone="subdued">
                  {t('billing.subscription_page.danger_zone_body', { date: formatDate(sub.currentPeriodEnd) })}
                </Text>
                <Box>
                  <Button tone="critical" onClick={() => setCancelOpen(true)}>
                    {t('billing.subscription_page.cancel_cta')}
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
        title={t('billing.modals.change_country.title')}
        primaryAction={{
          content: t('billing.modals.change_country.primary'),
          onAction: handleChangeCountry,
          loading: changingCountry,
          disabled: !newCountry,
        }}
        secondaryActions={[{ content: t('actions.cancel'), onAction: () => setChangeCountryOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              <Trans
                ns="common"
                i18nKey="billing.modals.change_country.body"
                values={{ country: sub.selectedCountry ? countryDisplay(sub.selectedCountry) : '—' }}
                components={{ strong: <strong /> }}
              />
            </Text>
            <Select
              label={t('billing.modals.change_country.select_label')}
              options={[{ label: t('billing.modals.change_country.placeholder'), value: '' }, ...changeCountryOpts]}
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
        title={t('billing.modals.addon.title')}
        primaryAction={{
          content: t('billing.modals.addon.primary', { currency, amount: addonAmount }),
          onAction: handleAddAddon,
          loading: addingAddon,
          disabled: !addonCountry,
        }}
        secondaryActions={[{ content: t('actions.cancel'), onAction: () => setAddonOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              {t('billing.modals.addon.body', { currency, amount: addonAmount })}
            </Text>
            <Select
              label={t('billing.modals.addon.select_label')}
              options={[
                { label: t('billing.modals.addon.placeholder'), value: '' },
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
        title={t('billing.modals.cancel.title')}
        primaryAction={{
          content: t('billing.modals.cancel.primary'),
          onAction: handleCancel,
          loading: cancelling,
          destructive: true,
        }}
        secondaryActions={[{ content: t('billing.modals.cancel.keep'), onAction: () => setCancelOpen(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            <Trans
              ns="common"
              i18nKey="billing.modals.cancel.body"
              values={{ date: formatDate(sub.currentPeriodEnd) }}
              components={{ strong: <strong /> }}
            />
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
