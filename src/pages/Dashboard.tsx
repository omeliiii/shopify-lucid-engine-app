import { useState, useEffect } from 'react';
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
  InlineStack,
  Badge,
  EmptyState,
  Select,
  TextField,
  Button
} from '@shopify/polaris';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { apiFetch } from '../utils/api';

interface ShippingLog {
  id: string;
  shopifyOrderId: string;
  orderDate: string;
  countryCode: string;
  totalWeightGrams: number;
  components: string;
}

interface KPI {
  totalWeightKg: number;
  weightByCountry: { country: string; weight: number }[];
  trackedOrders: number;
  ordersHistory: { day: string; count: number }[];
  materials: { name: string; percentage: number; color: "success" | "highlight" | "critical" | "primary" }[];
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ShippingLog[]>([]);
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [error, setError] = useState(false);

  // Pagination and Filters State
  const [page, setPage] = useState(1);
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Attempt to fetch logs with filters
        const params = new URLSearchParams({ page: page.toString(), limit: '10' });
        if (countryFilter !== 'ALL') params.append('country', countryFilter);
        if (periodStart) params.append('periodStart', periodStart);
        if (periodEnd) params.append('periodEnd', periodEnd);
        
        const logsData = await apiFetch(`/orders/logs?${params.toString()}`);
        setLogs(logsData.data || []);
        
        // Calculate or fetch KPIs
        const kpisData = await apiFetch('/orders/kpis');
        setKpis(kpisData);

      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [page, countryFilter, periodStart, periodEnd]);

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

  const getFlag = (countryCode: string) => {
    switch (countryCode.toUpperCase()) {
      case 'IT': return '🇮🇹 IT';
      case 'DE': return '🇩🇪 DE';
      case 'FR': return '🇫🇷 FR';
      default: return countryCode;
    }
  };

  const getCountryTone = (countryCode: string) => {
    switch (countryCode.toUpperCase()) {
      case 'IT': return 'success';
      case 'DE': return 'info';
      case 'FR': return 'attention';
      default: return 'new';
    }
  };

  const logRows = logs.map((log) => [
    <Text as="span" fontWeight="bold">{log.shopifyOrderId}</Text>,
    log.orderDate,
    <Badge tone={getCountryTone(log.countryCode) as any}>{getFlag(log.countryCode)}</Badge>,
    `${log.totalWeightGrams} g`,
    log.components
  ]);

  return (
    <Page title="Dashboard & Logs">
      <Layout>
        {/* KPI Section */}
        <Layout.Section variant="oneThird">
          <div style={{ height: '100%' }}>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm">Peso Totale per Paese</Text>
                  <Text as="p" variant="headingXl">{kpis?.totalWeightKg} kg</Text>
                  <div style={{ width: '100%', height: 200, marginTop: 'auto' }}>
                    {kpis?.weightByCountry ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kpis.weightByCountry} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e5e7" />
                          <XAxis dataKey="country" axisLine={false} tickLine={false} tick={{ fill: '#6d7175', fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value} kg`, 'Peso']} cursor={{ fill: '#f4f6f8' }} />
                          <Bar dataKey="weight" fill="#005bd3" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </BlockStack>
              </div>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <div style={{ height: '100%' }}>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm">Ordini Tracciati (Ultimi 5 gg)</Text>
                  <Text as="p" variant="headingXl">{kpis?.trackedOrders}</Text>
                  <div style={{ width: '100%', height: 200, marginTop: 'auto' }}>
                    {kpis?.ordersHistory ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={kpis.ordersHistory} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1c7100" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#1c7100" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e5e7" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6d7175', fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value} ordini`, 'Ordini']} />
                          <Area type="monotone" dataKey="count" stroke="#1c7100" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </BlockStack>
              </div>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <div style={{ height: '100%' }}>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm">Distribuzione Materiali</Text>
                  <div style={{ width: '100%', height: 250, marginTop: 'auto' }}>
                    {kpis?.materials && kpis.materials.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <Pie
                            data={kpis.materials}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="percentage"
                            nameKey="name"
                          >
                            {kpis.materials.map((entry, index) => {
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
                  </div>
                </BlockStack>
              </div>
            </Card>
          </div>
        </Layout.Section>

        {/* Logs Table Section */}
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="400">
              <div style={{ padding: '16px 16px 0 16px' }}>
                <Text as="h2" variant="headingMd">Ultimi Log di Spedizione</Text>
              </div>
              
              {/* Filters */}
              <div style={{ padding: '0 16px 16px 16px' }}>
                <InlineStack gap="400" blockAlign="end">
                  <Select
                    label="Filtra per Paese"
                    options={[
                      { label: 'Tutti i paesi', value: 'ALL' },
                      { label: 'Germania (DE)', value: 'DE' },
                      { label: 'Italia (IT)', value: 'IT' },
                      { label: 'Francia (FR)', value: 'FR' },
                    ]}
                    value={countryFilter}
                    onChange={(val) => { setCountryFilter(val); setPage(1); }}
                  />
                  <TextField label="Data inizio" type="date" value={periodStart} onChange={(val) => { setPeriodStart(val); setPage(1); }} autoComplete="off" />
                  <TextField label="Data fine" type="date" value={periodEnd} onChange={(val) => { setPeriodEnd(val); setPage(1); }} autoComplete="off" />
                  {(countryFilter !== 'ALL' || periodStart !== '' || periodEnd !== '') && (
                    <Button onClick={() => { setCountryFilter('ALL'); setPeriodStart(''); setPeriodEnd(''); setPage(1); }}>Resetta Filtri</Button>
                  )}
                </InlineStack>
              </div>

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
                  <p>Non ci sono ancora ordini tracciati con i calcoli dell'imballaggio.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
