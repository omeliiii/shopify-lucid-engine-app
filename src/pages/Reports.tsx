import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, DataTable, Badge, Button, Text, InlineStack, BlockStack, Modal, Form, FormLayout, Select, TextField, EmptyState, Icon } from '@shopify/polaris';
import { ExportIcon } from '@shopify/polaris-icons';
import { apiFetch, apiDownload } from '../utils/api';
import { CountryDateFilters } from '../components/CountryDateFilters';
import { FlagBadge } from '../components/FlagBadge';

interface Report {
  id: string;
  countryCode: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form State
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

      const data = await apiFetch(`/reports?${params.toString()}`);
      setReports(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error("Failed to load reports", e);
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
          periodEnd: endDate
        })
      });
      loadData();
    } catch (e) {
      setReports([{
        id: `rpt-${Math.random()}`,
        countryCode: country,
        periodType,
        periodStart: startDate,
        periodEnd: endDate,
        generatedAt: new Date().toISOString()
      }, ...reports]);
    } finally {
      setSubmitting(false);
      setModalOpen(false);
    }
  };

  const handleDownloadRegistry = async (id: string, countryCode: string) => {
    const ext = countryCode === 'DE' ? 'xml' : 'csv';
    const filename = `registro_${countryCode}_${id}.${ext}`;
    try {
      await apiDownload(`/reports/${id}/export/registry`, filename);
    } catch (e) {
      alert('Errore durante il download del file di registro.');
    }
  };

  const handleDownloadDualSystem = async (id: string) => {
    try {
      await apiDownload(`/reports/${id}/export/dual-system`, `dual_system_${id}.csv`);
    } catch (e) {
      alert('Errore durante il download del file Dual System.');
    }
  };

  const rows = reports.map((report) => [
    <FlagBadge countryCode={report.countryCode} />,
    report.periodType,
    `${report.periodStart} / ${report.periodEnd}`,
    new Date(report.generatedAt).toLocaleDateString(),
    <InlineStack gap="200">
      <Button
        size="micro"
        icon={ExportIcon}
        onClick={() => handleDownloadRegistry(report.id, report.countryCode)}
      >
        Registro
      </Button>
      <Button
        size="micro"
        icon={ExportIcon}
        onClick={() => handleDownloadDualSystem(report.id)}
      >
        Dual System
      </Button>
    </InlineStack>
  ]);

  return (
    <Page
      title="Report e Dichiarazioni"
      primaryAction={{
        content: 'Genera Nuovo Report',
        onAction: () => setModalOpen(true)
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {/* Filters */}
            <div style={{ padding: '16px' }}>
              <CountryDateFilters
                countryFilter={filterCountry}
                onCountryChange={(val) => { setFilterCountry(val); setPage(1); }}
                startDate={filterStartDate}
                onStartDateChange={(val) => { setFilterStartDate(val); setPage(1); }}
                endDate={filterEndDate}
                onEndDateChange={(val) => { setFilterEndDate(val); setPage(1); }}
                onReset={() => { setFilterCountry('ALL'); setFilterStartDate(''); setFilterEndDate(''); setPage(1); }}
              />
            </div>

            {reports.length === 0 && !loading ? (
              <EmptyState
                heading="Nessun report generato"
                action={{ content: 'Genera Report', onAction: () => setModalOpen(true) }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Genera il tuo primo report LUCID o CONAI per metterti in regola.</p>
              </EmptyState>
            ) : (
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                headings={['Paese', 'Periodo', 'Date', 'Generato Il', 'Azioni / Download']}
                rows={rows}
                pagination={{
                  hasNext: reports.length === 10,
                  hasPrevious: page > 1,
                  onNext: () => setPage(page + 1),
                  onPrevious: () => setPage(page - 1),
                }}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generazione Nuovo Report"
        primaryAction={{ content: 'Genera', onAction: handleGenerate, loading: submitting }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <Form onSubmit={handleGenerate}>
            <FormLayout>
              <Select
                label="Paese di Destinazione (Registro)"
                options={[
                  { label: 'Germania (LUCID)', value: 'DE' },
                  { label: 'Italia (CONAI)', value: 'IT' },
                  { label: 'Francia (CITEO)', value: 'FR' }
                ]}
                value={country}
                onChange={setCountry}
              />
              <Select
                label="Tipo di Periodo"
                options={[
                  { label: 'Annuale', value: 'ANNUAL' },
                  { label: 'Trimestrale', value: 'QUARTERLY' },
                  { label: 'Mensile', value: 'MONTHLY' }
                ]}
                value={periodType}
                onChange={setPeriodType}
              />
              <FormLayout.Group>
                <TextField label="Data Inizio" type="date" value={startDate} onChange={setStartDate} autoComplete="off" />
                <TextField label="Data Fine" type="date" value={endDate} onChange={setEndDate} autoComplete="off" />
              </FormLayout.Group>
              <BlockStack>
                <Text as="p" tone="subdued" variant="bodySm">
                  Il sistema aggregherà tutti gli ordini spediti verso il paese selezionato nel periodo indicato, calcolando i pesi totali per materiale.
                </Text>
              </BlockStack>
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
