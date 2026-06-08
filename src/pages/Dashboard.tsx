import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Banner,
  ProgressBar,
} from '@shopify/polaris';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../utils/api';
import { shopKey } from '../utils/storage';
import { useToast } from '../utils/toast';
import { countryLabel } from '../utils/countries';
import { CountryDateFilters } from '../components/CountryDateFilters';
import { FlagBadge } from '../components/FlagBadge';
import { OnboardingChecklist, type OnboardingStep } from '../components/OnboardingChecklist';
import { computeMissingCompliance, type ComplianceInfo } from '../utils/complianceApi';

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

const BACKFILL_JOB_STORAGE_KEY = shopKey('backfill_job_id');
const BACKFILL_LAST_RUN_STORAGE_KEY = shopKey('backfill_last_run');
const BACKFILL_POLL_INTERVAL_MS = 3000;
const BACKFILL_FAILURE_THRESHOLD = 3;

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('404');
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
  const navigate = useNavigate();
  const toast = useToast();
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const numberLocale = i18n.language?.startsWith('en') ? 'en-GB' : i18n.language || 'it';
  const dateLocale = i18n.language?.startsWith('en') ? 'en-GB' : `${i18n.language || 'it'}-${(i18n.language || 'it').toUpperCase()}`;

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ShippingLog[]>([]);
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [_error, setError] = useState(false);

  // Pagination and Filters State
  const [page, setPage] = useState(1);
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Setup state — drives the onboarding checklist
  const [hasInventory, setHasInventory] = useState(false);
  const [hasMappings, setHasMappings] = useState(false);
  const [hasRules, setHasRules] = useState(false);
  const [complianceInfo, setComplianceInfo] = useState<ComplianceInfo | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);

  // Backfill state
  const [backfillState, setBackfillState] = useState<BackfillUIState>('idle');
  const [backfillJobId, setBackfillJobId] = useState<string | null>(null);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(null);
  const [backfillFinalMessage, setBackfillFinalMessage] = useState<string | null>(null);
  const [backfillErrorMessage, setBackfillErrorMessage] = useState<string | null>(null);
  const [backfillStarting, setBackfillStarting] = useState(false);
  const [hasRunBackfillBefore, setHasRunBackfillBefore] = useState(false);
  const [pollNetworkBanner, setPollNetworkBanner] = useState(false);

  const formatBackfillSummary = useCallback(
    (p: BackfillProgress) =>
      t('backfill.summary', {
        processed: p.processed,
        duplicates: p.skippedDuplicate,
        excluded: p.skippedNonDe,
      }),
    [t],
  );

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
      toast.error(t('backfill.errors.load_dashboard'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, countryFilter, startDate, endDate, toast, t]);

  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load setup completion state (inventory / mappings / rules) in parallel
  const loadSetupState = useCallback(async () => {
    setSetupLoading(true);
    try {
      const [invRes, mappedRes, rulesRes, complianceRes] = await Promise.allSettled([
        apiFetch('/packaging/inventory'),
        apiFetch('/products/merged-view?page=1&limit=1&status=mapped'),
        apiFetch('/orders/shipping-rules'),
        apiFetch('/shops/compliance-info'),
      ]);

      if (invRes.status === 'fulfilled') {
        const items = Array.isArray(invRes.value) ? invRes.value : [];
        // Count only active, non-AI-suggested items (or AI-suggested that were confirmed)
        const active = items.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (i: any) => i.isActive && (!i.isAiSuggested || i.isConfirmed),
        );
        setHasInventory(active.length > 0);
      }

      if (mappedRes.status === 'fulfilled') {
        const totalMapped = mappedRes.value?.meta?.totalMapped ?? 0;
        setHasMappings(totalMapped > 0);
      }

      if (rulesRes.status === 'fulfilled') {
        const rules = Array.isArray(rulesRes.value) ? rulesRes.value : [];
        setHasRules(rules.length > 0);
      }

      if (complianceRes.status === 'fulfilled' && complianceRes.value) {
        setComplianceInfo(complianceRes.value as ComplianceInfo);
      }
    } finally {
      setSetupLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSetupState();
  }, [loadSetupState]);

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
          setBackfillErrorMessage(status.failedReason || t('backfill.errors.unknown'));
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
  }, [backfillState, backfillJobId, formatBackfillSummary, t]);

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
      toast.success(res.alreadyRunning ? t('backfill.toasts.already_running') : t('backfill.toasts.started'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : tCommon('errors.network');
      setBackfillErrorMessage(msg);
      setBackfillState('failed');
      toast.error(t('backfill.toasts.start_failed'));
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

  // ── Compliance: registration numbers still required ──────────────────────────
  // A number is "required" only when the shop has actually shipped to that
  // country (taken from the per-country orders KPI) and it hasn't been entered.
  const shippedCountryCodes = (kpis?.weightByCountry ?? [])
    .filter((c) => c.weightKg > 0)
    .map((c) => c.countryCode);
  const missingCompliance = computeMissingCompliance(complianceInfo, shippedCountryCodes);
  const missingComplianceLabel = missingCompliance
    .map((f) => `${f.portal} (${countryLabel(f.country)})`)
    .join(', ');

  // ── Onboarding checklist ─────────────────────────────────────────────────────
  // While onboarding is in progress the checklist carries the compliance step;
  // once it's done the standalone warning banner below takes over.
  const setupComplete = hasInventory && hasMappings && hasRules && hasRunBackfillBefore;

  const backfillProgressPercent = backfillProgress && backfillProgress.fetched > 0
    ? Math.min(100, Math.round((backfillProgress.processed / backfillProgress.fetched) * 100))
    : 0;

  const backfillExtra = backfillState === 'running' ? (
    <BlockStack gap="200">
      {backfillProgress ? (
        <>
          <Text as="p" tone="subdued" variant="bodySm">
            {t('backfill.progress.details', {
              fetched: backfillProgress.fetched.toLocaleString(numberLocale),
              processed: backfillProgress.processed.toLocaleString(numberLocale),
              duplicates: backfillProgress.skippedDuplicate.toLocaleString(numberLocale),
              excluded: backfillProgress.skippedNonDe.toLocaleString(numberLocale),
            })}
          </Text>
          {backfillProgress.fetched > 0 && (
            <ProgressBar progress={backfillProgressPercent} size="small" />
          )}
        </>
      ) : (
        <Text as="p" tone="subdued" variant="bodySm">{t('backfill.progress.initializing')}</Text>
      )}
      {pollNetworkBanner && (
        <Banner tone="warning">
          <p>{t('backfill.banners.network_warning')}</p>
        </Banner>
      )}
    </BlockStack>
  ) : backfillState === 'completed' && backfillFinalMessage ? (
    <Banner tone="success" title={t('backfill.banners.completed_title')} onDismiss={handleDismissBackfillResult}>
      <p>{backfillFinalMessage}</p>
    </Banner>
  ) : backfillState === 'failed' ? (
    <Banner tone="critical" title={t('backfill.banners.failed_title')} onDismiss={handleDismissBackfillResult}>
      <p>{t('backfill.banners.failed_body', { error: backfillErrorMessage ?? '' })}</p>
    </Banner>
  ) : null;

  const steps: OnboardingStep[] = [
    {
      id: 'inventory',
      title: t('onboarding.steps.inventory.title'),
      description: t('onboarding.steps.inventory.description'),
      done: hasInventory,
      ctaLabel: t('onboarding.steps.inventory.cta'),
      onAction: () => navigate('/inventory'),
    },
    {
      id: 'mapping',
      title: t('onboarding.steps.mapping.title'),
      description: t('onboarding.steps.mapping.description'),
      done: hasMappings,
      disabled: !hasInventory,
      ctaLabel: t('onboarding.steps.mapping.cta'),
      onAction: () => navigate('/mapping'),
    },
    {
      id: 'rules',
      title: t('onboarding.steps.rules.title'),
      description: t('onboarding.steps.rules.description'),
      done: hasRules,
      disabled: !hasMappings,
      ctaLabel: t('onboarding.steps.rules.cta'),
      onAction: () => navigate('/shipping-rules'),
    },
    {
      id: 'backfill',
      title: t('onboarding.steps.backfill.title'),
      description: hasRunBackfillBefore
        ? t('onboarding.steps.backfill.description_rerun')
        : t('onboarding.steps.backfill.description_first_run'),
      done: hasRunBackfillBefore && backfillState !== 'running',
      disabled: !hasRules || backfillStarting,
      inProgress: backfillState === 'running',
      ctaLabel: hasRunBackfillBefore
        ? t('onboarding.steps.backfill.cta_rerun')
        : t('onboarding.steps.backfill.cta_first_run'),
      onAction: handleStartBackfill,
      extra: backfillExtra,
    },
  ];

  // Only nudge for registration numbers once they're actually required.
  if (missingCompliance.length > 0) {
    steps.push({
      id: 'compliance',
      title: t('onboarding.steps.compliance.title'),
      description: t('onboarding.steps.compliance.description', { items: missingComplianceLabel }),
      done: false,
      ctaLabel: t('onboarding.steps.compliance.cta'),
      onAction: () => navigate('/settings'),
    });
  }

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
    const componentsLabel = (log.lineItems ?? [])
      .flatMap(li => (li.packaging_components ?? []).map(c => c.packaging_name))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');

    return [
      <Text as="span" fontWeight="bold">{log.shopifyOrderName}</Text>,
      log.orderDate,
      <FlagBadge countryCode={log.shippingCountryCode} />,
      tCommon('units.weight_g', { value: log.totalWeightGrams }),
      componentsLabel
    ];
  });

  return (
    <Page title={t('page.title')}>
      <Layout>
        {/* Onboarding checklist — shown until every step is done */}
        {!setupLoading && !setupComplete && (
          <Layout.Section>
            <OnboardingChecklist steps={steps} />
          </Layout.Section>
        )}

        {/* Compliance reminder — persistent warning once onboarding is complete */}
        {!setupLoading && setupComplete && missingCompliance.length > 0 && (
          <Layout.Section variant="fullWidth">
            <Banner
              tone="warning"
              title={t('compliance_banner.title')}
              action={{ content: t('compliance_banner.cta'), onAction: () => navigate('/settings') }}
            >
              <p>{t('compliance_banner.body', { items: missingComplianceLabel })}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Compact "in progress" banner when backfill is running and checklist is hidden */}
        {setupComplete && backfillState === 'running' && (
          <Layout.Section>
            <Banner tone="info" title={t('backfill.banners.running_title')}>
              {backfillProgress ? (
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm">
                    {t('backfill.progress.details_compact', {
                      fetched: backfillProgress.fetched.toLocaleString(numberLocale),
                      processed: backfillProgress.processed.toLocaleString(numberLocale),
                    })}
                  </Text>
                  {backfillProgress.fetched > 0 && (
                    <ProgressBar progress={backfillProgressPercent} size="small" />
                  )}
                </BlockStack>
              ) : (
                <Text as="p" variant="bodySm">{t('backfill.progress.initializing')}</Text>
              )}
            </Banner>
          </Layout.Section>
        )}

        {/* Backfill completed/failed banners once setup is complete and checklist is hidden */}
        {setupComplete && backfillState === 'completed' && backfillFinalMessage && (
          <Layout.Section>
            <Banner tone="success" title={t('backfill.banners.completed_title')} onDismiss={handleDismissBackfillResult}>
              <p>{backfillFinalMessage}</p>
            </Banner>
          </Layout.Section>
        )}
        {setupComplete && backfillState === 'failed' && (
          <Layout.Section>
            <Banner tone="critical" title={t('backfill.banners.failed_title')} onDismiss={handleDismissBackfillResult}>
              <p>{t('backfill.banners.failed_body', { error: backfillErrorMessage ?? '' })}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* KPI Section */}
        <DashboardCard
          title={t('kpis.weight_by_country.title')}
          value={<>{kpis?.totalWeightKg} {t('kpis.weight_by_country.value_unit')}</>}
        >
          {kpis?.weightByCountry ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 100, height: 200 }}>
              <BarChart data={kpis.weightByCountry} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e5e7" />
                <XAxis dataKey="countryCode" axisLine={false} tickLine={false} tick={{ fill: '#6d7175', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} kg`, t('kpis.weight_by_country.tooltip_label')]} cursor={{ fill: '#f4f6f8' }} />
                <Bar dataKey="weightKg" fill="#005bd3" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </DashboardCard>

        <DashboardCard
          title={t('kpis.tracked_orders.title')}
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
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString(dateLocale, { weekday: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#6d7175', fontSize: 12 }} />
                <Tooltip formatter={(value) => [t('kpis.tracked_orders.tooltip_value', { value }), t('kpis.tracked_orders.tooltip_label')]} />
                <Area type="monotone" dataKey="count" stroke="#1c7100" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </DashboardCard>

        <DashboardCard
          title={t('kpis.material_breakdown.title')}
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
            <Text as="p" tone="subdued">{t('kpis.material_breakdown.empty')}</Text>
          )}
        </DashboardCard>

        {/* Logs Table Section */}
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="400">
              <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockStart="400">
                <Text as="h2" variant="headingMd">{t('logs.section_title')}</Text>
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
                  headings={[
                    t('logs.table.order_id'),
                    t('logs.table.date'),
                    t('logs.table.country'),
                    t('logs.table.total_weight'),
                    t('logs.table.components'),
                  ]}
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
                  heading={t('logs.empty.heading')}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <Text as="p">{t('logs.empty.body')}</Text>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
