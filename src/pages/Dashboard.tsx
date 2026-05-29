import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  DataTable,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  BlockStack,
  EmptyState,
  Box,
  Button,
  Banner,
  ProgressBar,
  Spinner,
  InlineStack
} from '@shopify/polaris';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { apiFetch } from '../utils/api';
import { CountryDateFilters } from '../components/CountryDateFilters';
import { FlagBadge } from '../components/FlagBadge';

interface ShippingLog {
  id: string;
  shopifyOrderId: number;
  shopifyOrderName: string;
  orderDate: string;
  shippingCountryCode: string;
  totalWeightGrams: number;
  lineItems: LineItemSnapshot[];
}

interface LineItemSnapshot {
  shopify_product_id: number;
  quantity: number;
  packaging_components: {
    packaging_name: string;
    material: string;
    total_weight_grams: number;
  }[];
  line_total_weight_grams: number;
}

interface KPI {
  totalWeightKg: number;
  weightByCountry: { countryCode: string; weightKg: number }[];
  totalOrders: number;
  ordersHistory: { date: string; count: number }[];
  materialBreakdown: { material: string; weightKg: number; percentage: number }[];
}

interface BackfillProgress {
  fetched: number;
  processed: number;
  skippedDuplicate: number;
  skippedNonDe: number;
  failed: number;
}

interface BackfillStartResponse {
  jobId: string;
  alreadyRunning: boolean;
  since: string;
}

interface BackfillStatusResponse {
  jobId: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: BackfillProgress;
  failedReason: string | null;
  returnValue: BackfillProgress | null;
}

type BackfillUIState = 'idle' | 'running' | 'completed' | 'failed';

const BACKFILL_JOB_STORAGE_KEY = 'backfill_job_id';
const BACKFILL_LAST_RUN_STORAGE_KEY = 'backfill_last_run';
const BACKFILL_POLL_INTERVAL_MS = 3000;
const BACKFILL_FAILURE_THRESHOLD = 3;

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('404');
}

function formatBackfillSummary(p: BackfillProgress): string {
  return `Importati ${p.processed} ordini. ${p.skippedDuplicate} già presenti, ${p.skippedNonDe} esclusi (non-DE).`;
}

interface DashboardCardProps {
  title: string;
  value?: React.ReactNode;
  children: React.ReactNode;
  chartHeight?: number;
}

function DashboardCard({ title, value, children, chartHeight = 200 }: DashboardCardProps) {
  return (
    <Layout.Section variant="oneThird">
      <Box minHeight="100%">
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">{title}</Text>
              {value !== undefined && <Text as="p" variant="headingXl">{value}</Text>}
              <div style={{ width: '100%', height: chartHeight, marginTop: 'auto' }}>
                {children}
              </div>
            </BlockStack>
          </div>
        </Card>
      </Box>
    </Layout.Section>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ShippingLog[]>([]);
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [_error, setError] = useState(false);

  // Pagination and Filters State
  const [page, setPage] = useState(1);
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Backfill state
  const [backfillState, setBackfillState] = useState<BackfillUIState>('idle');
  const [backfillJobId, setBackfillJobId] = useState<string | null>(null);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(null);
  const [backfillFinalMessage, setBackfillFinalMessage] = useState<string | null>(null);
  const [backfillErrorMessage, setBackfillErrorMessage] = useState<string | null>(null);
  const [backfillStarting, setBackfillStarting] = useState(false);
  const [hasRunBackfillBefore, setHasRunBackfillBefore] = useState(false);
  const [pollNetworkBanner, setPollNetworkBanner] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (countryFilter !== 'ALL') params.append('countryCode', countryFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const logsData = await apiFetch(`/orders/logs?${params.toString()}`);
      setLogs(logsData.data || []);

      const kpisData = await apiFetch('/orders/kpis');
      setKpis(kpisData);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, countryFilter, startDate, endDate]);

  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Resume from any in-flight backfill on mount
  useEffect(() => {
    if (localStorage.getItem(BACKFILL_LAST_RUN_STORAGE_KEY)) {
      setHasRunBackfillBefore(true);
    }
    const storedJobId = localStorage.getItem(BACKFILL_JOB_STORAGE_KEY);
    if (storedJobId) {
      setBackfillJobId(storedJobId);
      setBackfillState('running');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll backfill status while running
  useEffect(() => {
    if (backfillState !== 'running' || !backfillJobId) return;

    let cancelled = false;
    let consecutiveFailures = 0;
    const jobId = backfillJobId;

    async function poll() {
      if (cancelled) return;
      try {
        const status = (await apiFetch(`/orders/backfill/${jobId}`)) as BackfillStatusResponse;
        if (cancelled) return;
        consecutiveFailures = 0;
        setPollNetworkBanner(false);
        setBackfillProgress(status.progress);

        if (status.state === 'completed') {
          const final = status.returnValue ?? status.progress;
          setBackfillFinalMessage(formatBackfillSummary(final));
          localStorage.removeItem(BACKFILL_JOB_STORAGE_KEY);
          localStorage.setItem(BACKFILL_LAST_RUN_STORAGE_KEY, new Date().toISOString());
          setHasRunBackfillBefore(true);
          setBackfillState('completed');
          loadDataRef.current();
        } else if (status.state === 'failed') {
          setBackfillErrorMessage(status.failedReason || 'Errore sconosciuto');
          localStorage.removeItem(BACKFILL_JOB_STORAGE_KEY);
          setBackfillState('failed');
        }
        // waiting / active / delayed → keep polling
      } catch (err) {
        if (cancelled) return;
        if (isNotFoundError(err)) {
          // Job expired on the backend — treat as no backfill in progress
          localStorage.removeItem(BACKFILL_JOB_STORAGE_KEY);
          setBackfillJobId(null);
          setBackfillProgress(null);
          setBackfillState('idle');
          return;
        }
        consecutiveFailures += 1;
        if (consecutiveFailures >= BACKFILL_FAILURE_THRESHOLD) {
          setPollNetworkBanner(true);
        }
      }
    }

    poll();
    const interval = setInterval(poll, BACKFILL_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [backfillState, backfillJobId]);

  const handleStartBackfill = async () => {
    setBackfillStarting(true);
    setBackfillErrorMessage(null);
    try {
      const res = (await apiFetch('/orders/backfill', { method: 'POST' })) as BackfillStartResponse;
      localStorage.setItem(BACKFILL_JOB_STORAGE_KEY, res.jobId);
      setBackfillJobId(res.jobId);
      setBackfillProgress(null);
      setPollNetworkBanner(false);
      setBackfillState('running');
    } catch (err) {
      setBackfillErrorMessage(err instanceof Error ? err.message : 'Errore di rete');
      setBackfillState('failed');
    } finally {
      setBackfillStarting(false);
    }
  };

  const handleDismissBackfillResult = () => {
    setBackfillFinalMessage(null);
    setBackfillErrorMessage(null);
    setBackfillProgress(null);
    setBackfillJobId(null);
    setBackfillState('idle');
  };

  if (loading && !kpis) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={2} />
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={10} />
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const logRows = logs.map((log) => {
    const componentsLabel = log.lineItems
      .flatMap(li => li.packaging_components.map(c => c.packaging_name))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');

    return [
      <Text as="span" fontWeight="bold">{log.shopifyOrderName}</Text>,
      log.orderDate,
      <FlagBadge countryCode={log.shippingCountryCode} />,
      `${log.totalWeightGrams} g`,
      componentsLabel
    ];
  });

  const backfillProgressPercent = backfillProgress && backfillProgress.fetched > 0
    ? Math.min(100, Math.round((backfillProgress.processed / backfillProgress.fetched) * 100))
    : 0;

  return (
    <Page title="Dashboard & Logs">
      <Layout>
        {/* Backfill Section */}
        <Layout.Section>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">Ordini storici</Text>
                <Text as="p" tone="subdued">
                  {hasRunBackfillBefore
                    ? 'Backfill già eseguito. Puoi rilanciarlo per recuperare eventuali nuovi ordini.'
                    : "Importa gli ordini pagati dal 1° gennaio fino a oggi. Operazione una tantum, può richiedere alcuni minuti."}
                </Text>
              </BlockStack>

              {backfillState === 'idle' && (
                <Box>
                  <Button
                    variant="primary"
                    onClick={handleStartBackfill}
                    loading={backfillStarting}
                  >
                    {hasRunBackfillBefore
                      ? 'Rilancia recupero ordini'
                      : "Recupera ordini di quest'anno"}
                  </Button>
                </Box>
              )}

              {backfillState === 'running' && (
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Spinner size="small" accessibilityLabel="Recupero in corso" />
                    <Text as="span" fontWeight="medium">Recupero in corso…</Text>
                  </InlineStack>
                  {backfillProgress ? (
                    <BlockStack gap="200">
                      <Text as="p" tone="subdued">
                        Scaricati {backfillProgress.fetched.toLocaleString('it-IT')} ·
                        Salvati {backfillProgress.processed.toLocaleString('it-IT')} ·
                        Duplicati {backfillProgress.skippedDuplicate.toLocaleString('it-IT')} ·
                        Esclusi {backfillProgress.skippedNonDe.toLocaleString('it-IT')}
                      </Text>
                      {backfillProgress.fetched > 0 && (
                        <ProgressBar progress={backfillProgressPercent} size="small" />
                      )}
                    </BlockStack>
                  ) : (
                    <Text as="p" tone="subdued">Inizializzazione…</Text>
                  )}
                  <Box>
                    <Button disabled>Recupero in corso…</Button>
                  </Box>
                  {pollNetworkBanner && (
                    <Banner tone="warning">
                      <p>Connessione persa, riprovo…</p>
                    </Banner>
                  )}
                </BlockStack>
              )}

              {backfillState === 'completed' && backfillFinalMessage && (
                <Banner
                  tone="success"
                  title="Recupero completato"
                  onDismiss={handleDismissBackfillResult}
                >
                  <p>{backfillFinalMessage}</p>
                </Banner>
              )}

              {backfillState === 'failed' && (
                <Banner
                  tone="critical"
                  title="Recupero non riuscito"
                  onDismiss={handleDismissBackfillResult}
                >
                  <p>Il recupero non è andato a buon fine: {backfillErrorMessage}. Riprova.</p>
                </Banner>
              )}
            </BlockStack>
            </div>
          </Card>
        </Layout.Section>

        {/* KPI Section */}
        <DashboardCard
          title="Peso Totale per Paese"
          value={<>{kpis?.totalWeightKg} kg</>}
        >
          {kpis?.weightByCountry ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 100, height: 200 }}>
              <BarChart data={kpis.weightByCountry} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e5e7" />
                <XAxis dataKey="countryCode" axisLine={false} tickLine={false} tick={{ fill: '#6d7175', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} kg`, 'Peso']} cursor={{ fill: '#f4f6f8' }} />
                <Bar dataKey="weightKg" fill="#005bd3" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </DashboardCard>

        <DashboardCard
          title="Ordini Tracciati (Ultimi 5 gg)"
          value={kpis?.totalOrders}
        >
          {kpis?.ordersHistory ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 100, height: 200 }}>
              <AreaChart data={kpis.ordersHistory} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1c7100" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1c7100" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e5e7" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('it-IT', { weekday: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#6d7175', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} ordini`, 'Ordini']} />
                <Area type="monotone" dataKey="count" stroke="#1c7100" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </DashboardCard>

        <DashboardCard
          title="Distribuzione Materiali"
          chartHeight={250}
        >
          {kpis?.materialBreakdown && kpis.materialBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 100, height: 250 }}>
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={kpis.materialBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="percentage"
                  nameKey="material"
                >
                  {kpis.materialBreakdown.map((_entry, index) => {
                    const colors = ['#1c7100', '#005bd3', '#e3a008', '#de3618', '#000000'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Text as="p" tone="subdued">Nessun dato disponibile</Text>
          )}
        </DashboardCard>

        {/* Logs Table Section */}
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="400">
              <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockStart="400">
                <Text as="h2" variant="headingMd">Ultimi Log di Spedizione</Text>
              </Box>

              {/* Filters */}
              <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockEnd="400">
                <CountryDateFilters
                  countryFilter={countryFilter}
                  onCountryChange={(val) => { setCountryFilter(val); setPage(1); }}
                  startDate={startDate}
                  onStartDateChange={(val) => { setStartDate(val); setPage(1); }}
                  endDate={endDate}
                  onEndDateChange={(val) => { setEndDate(val); setPage(1); }}
                  onReset={() => { setCountryFilter('ALL'); setStartDate(''); setEndDate(''); setPage(1); }}
                />
              </Box>

              {logs.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'numeric', 'text']}
                  headings={['ID Ordine', 'Data', 'Paese', 'Peso Totale', 'Componenti']}
                  rows={logRows}
                  pagination={{
                    hasNext: logs.length === 10,
                    hasPrevious: page > 1,
                    onNext: () => setPage(page + 1),
                    onPrevious: () => setPage(page - 1),
                  }}
                />
              ) : (
                <EmptyState
                  heading="Nessun log disponibile"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <Text as="p">Non ci sono ancora ordini tracciati con i calcoli dell'imballaggio.</Text>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
