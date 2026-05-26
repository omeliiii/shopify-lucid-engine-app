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
import { CountryDateFilters } from '../components/CountryDateFilters';

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

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ShippingLog[]>([]);
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [error, setError] = useState(false);

  // Pagination and Filters State
  const [page, setPage] = useState(1);
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Attempt to fetch logs with filters
        const params = new URLSearchParams({ page: page.toString(), limit: '10' });
        if (countryFilter !== 'ALL') params.append('countryCode', countryFilter);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
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
  }, [page, countryFilter, startDate, endDate]);

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

  const logRows = logs.map((log) => {
    const componentsLabel = log.lineItems
      .flatMap(li => li.packaging_components.map(c => c.packaging_name))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');

    return [
      <Text as="span" fontWeight="bold">{log.shopifyOrderName}</Text>,
      log.orderDate,
      <Badge tone={getCountryTone(log.shippingCountryCode) as any}>{getFlag(log.shippingCountryCode)}</Badge>,
      `${log.totalWeightGrams} g`,
      componentsLabel
    ];
  });

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
                      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 100, height: 200 }}>
                        <BarChart data={kpis.weightByCountry} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e5e7" />
                          <XAxis dataKey="countryCode" axisLine={false} tickLine={false} tick={{ fill: '#6d7175', fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value} kg`, 'Peso']} cursor={{ fill: '#f4f6f8' }} />
                          <Bar dataKey="weightKg" fill="#005bd3" radius={[4, 4, 0, 0]} barSize={40} />
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
                  <Text as="p" variant="headingXl">{kpis?.totalOrders}</Text>
                  <div style={{ width: '100%', height: 200, marginTop: 'auto' }}>
                    {kpis?.ordersHistory ? (
                      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 100, height: 200 }}>
                        <AreaChart data={kpis.ordersHistory} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1c7100" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#1c7100" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e5e7" />
                          <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('it-IT', { weekday: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#6d7175', fontSize: 12 }} />
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
                            {kpis.materialBreakdown.map((entry, index) => {
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
                <CountryDateFilters
                  countryFilter={countryFilter}
                  onCountryChange={(val) => { setCountryFilter(val); setPage(1); }}
                  startDate={startDate}
                  onStartDateChange={(val) => { setStartDate(val); setPage(1); }}
                  endDate={endDate}
                  onEndDateChange={(val) => { setEndDate(val); setPage(1); }}
                  onReset={() => { setCountryFilter('ALL'); setStartDate(''); setEndDate(''); setPage(1); }}
                />
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
