import { useState, useEffect, useCallback } from 'react';
import {
  Page, Layout, Card, DataTable, Badge, Button, Text, InlineStack, BlockStack,
  Modal, Form, FormLayout, EmptyState, Tooltip, Icon,
} from '@shopify/polaris';
import { ExportIcon, LockIcon } from '@shopify/polaris-icons';
import { useTranslation, Trans } from 'react-i18next';
import { apiFetch, apiDownload, isBillingError } from '../utils/api';
import { CountryDateFilters } from '../components/CountryDateFilters';
import { PolarisDatePicker } from '../components/PolarisDatePicker';
import { PolarisSelect } from '../components/PolarisSelect';
import { FlagBadge } from '../components/FlagBadge';
import { useBilling } from '../contexts/BillingProvider';
import { useNavigate } from 'react-router-dom';
import type { LockedReason } from '../types/billingTypes';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReportExport {
  id: string;
  destinationType: string;
  destinationCode: string;
  outputFormat: string;
}

type ReportStatus = 'PROCESSING' | 'READY' | 'ERROR';

interface Report {
  id: string;
  countryCode: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  downloadedAt: string | null;
  notificationSentAt: string | null;
  exports: ReportExport[];
  canDownload?: boolean;
  lockedReason?: LockedReason | null;
  /** Backend lifecycle of the report. Defaults to READY when missing. */
  status?: ReportStatus;
  /** Human-readable error when status === 'ERROR'. */
  errorMessage?: string | null;
}

interface ReportListResponse {
  data: Report[];
  meta: {
    totalItems: number;
    page: number;
    limit: number;
    unreadCount?: number;
    entitlements?: unknown;
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Reports() {
  const navigate = useNavigate();
  const { catalog, redirectToAddon } = useBilling();
  const { t, i18n } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');

  const dateLocale = i18n.language?.startsWith('en') ? 'en-GB' : `${i18n.language || 'it'}-${(i18n.language || 'it').toUpperCase()}`;

  const ReportStatusBadge = ({ report }: { report: Report }) => {
    const status: ReportStatus = report.status ?? 'READY';
    if (status === 'PROCESSING') {
      return <Badge tone="info" progress="incomplete">{t('status.processing')}</Badge>;
    }
    if (status === 'ERROR') {
      return <Badge tone="critical">{t('status.error')}</Badge>;
    }
    return <Badge tone="success" progress="complete">{t('status.ready')}</Badge>;
  };

  const [newReports, setNewReports] = useState<Report[]>([]);
  const [pastReports, setPastReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Pagination & Filters State (applied to past reports only)
  const [page, setPage] = useState(1);
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form State (manual generation — kept for backfills / testing)
  const [country, setCountry] = useState('DE');
  const [periodType, setPeriodType] = useState('QUARTERLY');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-03-31');

  // Add-on modal for COUNTRY_NOT_INCLUDED
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonModalCountry, setAddonModalCountry] = useState('');
  const [addingAddon, setAddingAddon] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shopify = typeof window !== 'undefined' ? (window as any).shopify : null;
  const showToast = (msg: string, opts?: { isError?: boolean }) => {
    if (shopify?.toast) shopify.toast.show(msg, opts);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (filterCountry !== 'ALL') params.append('countryCode', filterCountry);
      if (filterStartDate) params.append('periodStart', filterStartDate);
      if (filterEndDate) params.append('periodEnd', filterEndDate);

      const data: ReportListResponse | Report[] = await apiFetch(`/reports?${params.toString()}`);
      const items: Report[] = Array.isArray(data) ? data : data.data || [];

      setNewReports(items.filter((r) => !r.downloadedAt));
      setPastReports(items.filter((r) => r.downloadedAt));
    } catch (e) {
      console.error('Failed to load reports', e);
      showToast(t('toasts.load_failed'), { isError: true });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterCountry, filterStartDate, filterEndDate, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: country,
          periodType,
          periodStart: startDate,
          periodEnd: endDate,
        }),
      });
      loadData();
    } catch (e) {
      console.error('Failed to generate report', e);
      showToast(t('toasts.generate_failed'), { isError: true });
    } finally {
      setSubmitting(false);
      setModalOpen(false);
    }
  };

  const handleDownloadBundle = async (report: Report) => {
    setDownloadingId(report.id);
    const fallback = `${report.countryCode}-${report.periodStart}_${report.periodEnd}.zip`;
    try {
      await apiDownload(`/reports/${report.id}/download`, fallback);
      // Move the report from "new" to "past" optimistically
      setNewReports((prev) => prev.filter((r) => r.id !== report.id));
      setPastReports((prev) => [{ ...report, downloadedAt: new Date().toISOString() }, ...prev]);
    } catch (e) {
      // Handle structured billing errors from download endpoints
      if (isBillingError(e)) {
        if (e.error === 'SUBSCRIPTION_ACCESS_DENIED') {
          const reason = e.details?.reason;
          if (reason === 'TRIAL') {
            showToast(t('toasts.trial_blocked'), { isError: true });
          } else if (reason === 'COUNTRY_NOT_INCLUDED') {
            setAddonModalCountry(report.countryCode);
            setAddonModalOpen(true);
          } else if (reason === 'EXPIRED') {
            showToast(t('toasts.expired_blocked'), { isError: true });
            navigate('/billing/start');
          } else {
            navigate('/billing/start');
          }
        } else if (e.error === 'NO_ACTIVE_SUBSCRIPTION') {
          navigate('/billing/start');
        } else if (e.error === 'SHOPIFY_BILLING_ERROR') {
          showToast(t('toasts.shopify_billing_issue'), { isError: true });
        } else {
          showToast(e.message || t('toasts.download_failed'), { isError: true });
        }
      } else {
        console.error('Failed to download report bundle', e);
        showToast(t('toasts.download_failed'), { isError: true });
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAddonFromReport = async () => {
    setAddingAddon(true);
    try {
      await redirectToAddon(addonModalCountry);
    } catch {
      showToast(t('toasts.addon_failed'), { isError: true });
    } finally {
      setAddingAddon(false);
      setAddonModalOpen(false);
    }
  };

  // ── Row builder ──
  const buildRow = (report: Report, isNew: boolean) => {
    const formatsLabel = report.exports?.length
      ? report.exports.map((e) => e.outputFormat.toUpperCase()).join(' + ')
      : '—';

    const status: ReportStatus = report.status ?? 'READY';
    const canDownload = report.canDownload !== false && status === 'READY';
    const lockedReason = report.lockedReason;
    const addonAmount = catalog?.addon.amount ?? 99;
    const currency = catalog?.currency === 'USD' ? '$' : (catalog?.currency ?? '$');

    // Build the action cell based on download access
    let actionCell: React.ReactNode;

    if (status === 'PROCESSING') {
      actionCell = (
        <Tooltip content={t('tooltips.processing')} dismissOnMouseOut>
          <Button size="micro" icon={ExportIcon} disabled>{t('actions.download')}</Button>
        </Tooltip>
      );
    } else if (status === 'ERROR') {
      actionCell = (
        <Tooltip content={report.errorMessage || t('tooltips.error_default')} dismissOnMouseOut>
          <Button size="micro" disabled>{t('actions.download_unavailable')}</Button>
        </Tooltip>
      );
    } else if (canDownload) {
      actionCell = (
        <Button
          size="micro"
          icon={ExportIcon}
          variant={isNew ? 'primary' : 'secondary'}
          loading={downloadingId === report.id}
          onClick={() => handleDownloadBundle(report)}
        >
          {t('actions.download')}
        </Button>
      );
    } else if (lockedReason === 'TRIAL') {
      actionCell = (
        <Tooltip content={t('tooltips.trial_locked')} dismissOnMouseOut>
          <Button size="micro" icon={LockIcon} disabled>
            {t('actions.download')}
          </Button>
        </Tooltip>
      );
    } else if (lockedReason === 'COUNTRY_NOT_INCLUDED') {
      actionCell = (
        <Button
          size="micro"
          variant="primary"
          onClick={() => {
            setAddonModalCountry(report.countryCode);
            setAddonModalOpen(true);
          }}
        >
          {t('actions.add_country', { country: report.countryCode, currency, amount: addonAmount })}
        </Button>
      );
    } else if (lockedReason === 'EXPIRED') {
      actionCell = (
        <Button size="micro" variant="primary" onClick={() => navigate('/billing/start')}>
          {t('actions.renew')}
        </Button>
      );
    } else if (lockedReason === 'NO_ACCESS') {
      actionCell = (
        <Button size="micro" variant="primary" onClick={() => navigate('/billing/start')}>
          {t('actions.subscribe')}
        </Button>
      );
    } else {
      actionCell = (
        <Button size="micro" icon={LockIcon} disabled>
          {t('actions.download_locked')}
        </Button>
      );
    }

    const periodLabel = t(`period_types.${report.periodType}` as 'period_types.ANNUAL', {
      defaultValue: report.periodType,
    });

    return [
      <InlineStack gap="200" align="start" blockAlign="center">
        <FlagBadge countryCode={report.countryCode} />
        {isNew && <Badge tone="info">{t('status.new_badge')}</Badge>}
        {!canDownload && lockedReason === 'TRIAL' && status === 'READY' && (
          <Icon source={LockIcon} tone="subdued" />
        )}
      </InlineStack>,
      <ReportStatusBadge report={report} />,
      periodLabel,
      `${report.periodStart} → ${report.periodEnd}`,
      new Date(report.generatedAt).toLocaleDateString(dateLocale),
      <Text as="span" tone="subdued" variant="bodySm">
        {formatsLabel}
      </Text>,
      actionCell,
    ];
  };

  const newRows = newReports.map((r) => buildRow(r, true));
  const pastRows = pastReports.map((r) => buildRow(r, false));

  const tableHeadings = [
    t('table.columns.country'),
    t('table.columns.status'),
    t('table.columns.period_type'),
    t('table.columns.dates'),
    t('table.columns.generated_at'),
    t('table.columns.formats'),
    t('table.columns.download'),
  ];
  const tableColTypes = ['text', 'text', 'text', 'text', 'text', 'text', 'text'] as const;

  const addonAmount = catalog?.addon.amount ?? 99;
  const addonCurrency = catalog?.currency === 'USD' ? '$' : (catalog?.currency ?? '$');

  return (
    <Page
      title={t('page.title')}
      subtitle={t('page.subtitle')}
      secondaryActions={[
        {
          content: t('page.secondary_action_manual'),
          onAction: () => setModalOpen(true),
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <div style={{ padding: '16px' }}>
              <CountryDateFilters
                countryFilter={filterCountry}
                onCountryChange={(val) => { setFilterCountry(val); setPage(1); }}
                startDate={filterStartDate}
                onStartDateChange={(val) => { setFilterStartDate(val); setPage(1); }}
                endDate={filterEndDate}
                onEndDateChange={(val) => { setFilterEndDate(val); setPage(1); }}
                onReset={() => {
                  setFilterCountry('ALL');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setPage(1);
                }}
              />
            </div>
          </Card>
        </Layout.Section>

        {/* ── New reports ── */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  {t('sections.new_reports_title')}
                </Text>
                {newReports.length > 0 && <Badge tone="info">{`${newReports.length}`}</Badge>}
              </InlineStack>
              {newReports.length === 0 && !loading ? (
                <Text as="p" tone="subdued">
                  {t('sections.new_reports_empty')}
                </Text>
              ) : (
                <DataTable
                  columnContentTypes={[...tableColTypes]}
                  headings={tableHeadings}
                  rows={newRows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* ── Past reports ── */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                {t('sections.past_reports_title')}
              </Text>
              {pastReports.length === 0 && !loading ? (
                <EmptyState
                  heading={t('empty_state.past_heading')}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>{t('empty_state.past_body')}</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={[...tableColTypes]}
                  headings={tableHeadings}
                  rows={pastRows}
                  pagination={{
                    hasNext: pastReports.length === 10,
                    hasPrevious: page > 1,
                    onNext: () => setPage(page + 1),
                    onPrevious: () => setPage(page - 1),
                  }}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* ── Modal: Manual Generation ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('manual_modal.title')}
        primaryAction={{ content: t('manual_modal.primary'), onAction: handleGenerate, loading: submitting }}
        secondaryActions={[{ content: tCommon('actions.cancel'), onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <Form onSubmit={handleGenerate}>
            <FormLayout>
              <PolarisSelect
                label={t('manual_modal.form.country_label')}
                options={[
                  { label: t('schemes.DE'), value: 'DE' },
                  { label: t('schemes.IT'), value: 'IT' },
                  { label: t('schemes.FR'), value: 'FR' },
                ]}
                value={country}
                onChange={setCountry}
              />
              <PolarisSelect
                label={t('manual_modal.form.period_type_label')}
                options={[
                  { label: t('period_types.ANNUAL'), value: 'ANNUAL' },
                  { label: t('period_types.QUARTERLY'), value: 'QUARTERLY' },
                  { label: t('period_types.MONTHLY'), value: 'MONTHLY' },
                ]}
                value={periodType}
                onChange={setPeriodType}
              />
              <FormLayout.Group>
                <PolarisDatePicker label={t('manual_modal.form.start_date_label')} value={startDate} onChange={setStartDate} />
                <PolarisDatePicker label={t('manual_modal.form.end_date_label')} value={endDate} onChange={setEndDate} />
              </FormLayout.Group>
              <Text as="p" tone="subdued" variant="bodySm">
                {t('manual_modal.form.footer_note')}
              </Text>
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      {/* ── Modal: Add Country for Download ── */}
      <Modal
        open={addonModalOpen}
        onClose={() => setAddonModalOpen(false)}
        title={t('addon_modal.title')}
        primaryAction={{
          content: t('addon_modal.primary', { country: addonModalCountry, currency: addonCurrency, amount: addonAmount }),
          onAction: handleAddonFromReport,
          loading: addingAddon,
        }}
        secondaryActions={[{ content: tCommon('actions.cancel'), onAction: () => setAddonModalOpen(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            <Trans
              ns="reports"
              i18nKey="addon_modal.body"
              values={{ country: addonModalCountry, currency: addonCurrency, amount: addonAmount }}
              components={{ strong: <strong /> }}
            />
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
