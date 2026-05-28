import { useState, useEffect, useCallback } from 'react';
import {
  Page, Layout, Card, DataTable, Badge, Button, Text, InlineStack, BlockStack,
  Modal, Form, FormLayout, EmptyState, Tooltip, Icon,
} from '@shopify/polaris';
import { ExportIcon, LockIcon } from '@shopify/polaris-icons';
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
    } finally {
      setLoading(false);
    }
  }, [page, filterCountry, filterStartDate, filterEndDate]);

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
            showToast('Upgrade or wait until your trial ends to download reports', { isError: true });
          } else if (reason === 'COUNTRY_NOT_INCLUDED') {
            setAddonModalCountry(report.countryCode);
            setAddonModalOpen(true);
          } else if (reason === 'EXPIRED') {
            showToast('Your subscription has expired. Please renew.', { isError: true });
            navigate('/billing/start');
          } else {
            navigate('/billing/start');
          }
        } else if (e.error === 'NO_ACTIVE_SUBSCRIPTION') {
          navigate('/billing/start');
        } else if (e.error === 'SHOPIFY_BILLING_ERROR') {
          showToast('Shopify is having issues, try again in a moment', { isError: true });
        } else {
          showToast(e.message || 'Download failed', { isError: true });
        }
      } else {
        console.error('Failed to download report bundle', e);
        showToast('Errore durante il download del report.', { isError: true });
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
      showToast('Something went wrong', { isError: true });
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

    const canDownload = report.canDownload !== false;
    const lockedReason = report.lockedReason;
    const addonAmount = catalog?.addon.amount ?? 99;

    // Build the action cell based on download access
    let actionCell: React.ReactNode;

    if (canDownload) {
      actionCell = (
        <Button
          size="micro"
          icon={ExportIcon}
          variant={isNew ? 'primary' : 'secondary'}
          loading={downloadingId === report.id}
          onClick={() => handleDownloadBundle(report)}
        >
          Scarica
        </Button>
      );
    } else if (lockedReason === 'TRIAL') {
      actionCell = (
        <Tooltip content="Upgrade or wait until trial ends to download" dismissOnMouseOut>
          <Button size="micro" icon={LockIcon} disabled>
            Scarica
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
          {`Add country ($${addonAmount})`}
        </Button>
      );
    } else if (lockedReason === 'EXPIRED') {
      actionCell = (
        <Button size="micro" variant="primary" onClick={() => navigate('/billing/start')}>
          Renew
        </Button>
      );
    } else if (lockedReason === 'NO_ACCESS') {
      actionCell = (
        <Button size="micro" variant="primary" onClick={() => navigate('/billing/start')}>
          Subscribe
        </Button>
      );
    } else {
      // Fallback — should not happen but display locked state
      actionCell = (
        <Button size="micro" icon={LockIcon} disabled>
          Locked
        </Button>
      );
    }

    return [
      <InlineStack gap="200" align="start" blockAlign="center">
        <FlagBadge countryCode={report.countryCode} />
        {isNew && <Badge tone="info">Nuovo</Badge>}
        {!canDownload && lockedReason === 'TRIAL' && (
          <Icon source={LockIcon} tone="subdued" />
        )}
      </InlineStack>,
      report.periodType,
      `${report.periodStart} → ${report.periodEnd}`,
      new Date(report.generatedAt).toLocaleDateString(),
      <Text as="span" tone="subdued" variant="bodySm">
        {formatsLabel}
      </Text>,
      actionCell,
    ];
  };

  const newRows = newReports.map((r) => buildRow(r, true));
  const pastRows = pastReports.map((r) => buildRow(r, false));

  const tableHeadings = ['Paese', 'Periodo', 'Date', 'Generato il', 'Formati', 'Download'];
  const tableColTypes = ['text', 'text', 'text', 'text', 'text', 'text'] as const;

  return (
    <Page
      title="Report e Dichiarazioni"
      subtitle="I report vengono generati automaticamente in base alla cadenza configurata per ciascun paese."
      secondaryActions={[
        {
          content: 'Genera manualmente',
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
                  Nuovi report
                </Text>
                {newReports.length > 0 && <Badge tone="info">{`${newReports.length}`}</Badge>}
              </InlineStack>
              {newReports.length === 0 && !loading ? (
                <Text as="p" tone="subdued">
                  Nessun nuovo report da scaricare. Quando lo scheduler genera un report, comparirà qui.
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
                Report scaricati
              </Text>
              {pastReports.length === 0 && !loading ? (
                <EmptyState
                  heading="Nessun report scaricato"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>I report già scaricati appariranno qui per consultazione futura.</p>
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
        title="Generazione manuale del report"
        primaryAction={{ content: 'Genera', onAction: handleGenerate, loading: submitting }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <Form onSubmit={handleGenerate}>
            <FormLayout>
              <PolarisSelect
                label="Paese di destinazione"
                options={[
                  { label: 'Germania (LUCID)', value: 'DE' },
                  { label: 'Italia (CONAI)', value: 'IT' },
                  { label: 'Francia (CITEO)', value: 'FR' },
                ]}
                value={country}
                onChange={setCountry}
              />
              <PolarisSelect
                label="Tipo di periodo"
                options={[
                  { label: 'Annuale', value: 'ANNUAL' },
                  { label: 'Trimestrale', value: 'QUARTERLY' },
                  { label: 'Mensile', value: 'MONTHLY' },
                ]}
                value={periodType}
                onChange={setPeriodType}
              />
              <FormLayout.Group>
                <PolarisDatePicker label="Data inizio" value={startDate} onChange={setStartDate} />
                <PolarisDatePicker label="Data fine" value={endDate} onChange={setEndDate} />
              </FormLayout.Group>
              <Text as="p" tone="subdued" variant="bodySm">
                I report vengono generati automaticamente secondo la cadenza configurata per ciascun
                paese. Usa questo form solo per backfill o test.
              </Text>
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      {/* ── Modal: Add Country for Download ── */}
      <Modal
        open={addonModalOpen}
        onClose={() => setAddonModalOpen(false)}
        title="Country not included"
        primaryAction={{
          content: `Add ${addonModalCountry} ($${catalog?.addon.amount ?? 99}/year)`,
          onAction: handleAddonFromReport,
          loading: addingAddon,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setAddonModalOpen(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            This report requires access to <strong>{addonModalCountry}</strong>, which is not
            included in your current plan. Add it as an extra country for
            ${catalog?.addon.amount ?? 99}/year.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
