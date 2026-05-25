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
  ProgressBar,
  EmptyState
} from '@shopify/polaris';
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
  trackedOrders: number;
  materials: { name: string; percentage: number; color: "success" | "highlight" | "critical" | "primary" }[];
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ShippingLog[]>([]);
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Attempt to fetch logs
        const logsData = await apiFetch('/orders/logs?page=1&limit=10');
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
  }, []);

  if (loading) {
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

  const logRows = logs.map((log) => [
    <Text as="span" fontWeight="bold">{log.shopifyOrderId}</Text>,
    log.orderDate,
    <Badge tone="info">{log.countryCode}</Badge>,
    `${log.totalWeightGrams} g`,
    log.components
  ]);

  return (
    <Page title="Dashboard & Logs">
      <Layout>
        {/* KPI Section */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">Peso Totale Spedito</Text>
              <Text as="p" variant="headingXl">{kpis?.totalWeightKg} kg</Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">Ordini Tracciati</Text>
              <Text as="p" variant="headingXl">{kpis?.trackedOrders}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">Distribuzione Materiali</Text>
              <BlockStack gap="200">
                {kpis?.materials.map((mat) => (
                  <BlockStack key={mat.name} gap="100">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">{mat.name}</Text>
                      <Text as="span" variant="bodySm" fontWeight="bold">{mat.percentage}%</Text>
                    </InlineStack>
                    <ProgressBar progress={mat.percentage} size="small" tone={mat.color} />
                  </BlockStack>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Logs Table Section */}
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="400">
              <div style={{ padding: '16px 16px 0 16px' }}>
                <Text as="h2" variant="headingMd">Ultimi Log di Spedizione</Text>
              </div>
              
              {logs.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'numeric', 'text']}
                  headings={['ID Ordine', 'Data', 'Paese', 'Peso Totale', 'Componenti']}
                  rows={logRows}
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
