import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, DataTable, Badge, Button, Text, InlineStack, BlockStack, Modal, Form, FormLayout, EmptyState } from '@shopify/polaris';
import { ExportIcon } from '@shopify/polaris-icons';
import { apiFetch, apiDownload } from '../utils/api';
import { CountryDateFilters } from '../components/CountryDateFilters';
import { PolarisDatePicker } from '../components/PolarisDatePicker';
import { PolarisSelect } from '../components/PolarisSelect';
import { FlagBadge } from '../components/FlagBadge';

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
}

interface ReportListResponse {
  data: Report[];
  meta: { totalItems: number; page: number; limit: number; unreadCount?: number };
}

export default function Reports() {
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
      console.error('Failed to download report bundle', e);
      alert('Errore durante il download del report.');
    } finally {
      setDownloadingId(null);
    }
  };

  const buildRow = (report: Report, isNew: boolean) => {
    const formatsLabel = report.exports?.length
      ? report.exports.map((e) => e.outputFormat.toUpperCase()).join(' + ')
      : '—';

    return [
      <InlineStack gap="200" align="start" blockAlign="center">
        <FlagBadge countryCode={report.countryCode} />
        {isNew && <Badge tone="info">Nuovo</Badge>}
      </InlineStack>,
      report.periodType,
      `${report.periodStart} → ${report.periodEnd}`,
      new Date(report.generatedAt).toLocaleDateString(),
      <Text as="span" tone="subdued" variant="bodySm">
        {formatsLabel}
      </Text>,
      <Button
        size="micro"
        icon={ExportIcon}
        variant={isNew ? 'primary' : 'secondary'}
        loading={downloadingId === report.id}
        onClick={() => handleDownloadBundle(report)}
      >
        Scarica
      </Button>,
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
    </Page>
  );
}
