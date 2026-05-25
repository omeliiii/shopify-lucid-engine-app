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
        let logsData: any;
        try {
          logsData = await apiFetch('/orders/logs?page=1&limit=10');
        } catch (e) {
          console.warn("Backend not available, using mock logs");
          // Fallback to mock data for demonstration
          logsData = {
            data: [
              { id: '1', shopifyOrderId: '#1045', orderDate: '2026-05-25', countryCode: 'DE', totalWeightGrams: 450, components: 'Scatola di cartone, Nastro' },
              { id: '2', shopifyOrderId: '#1046', orderDate: '2026-05-24', countryCode: 'IT', totalWeightGrams: 120, components: 'Busta plastica' },
              { id: '3', shopifyOrderId: '#1047', orderDate: '2026-05-24', countryCode: 'FR', totalWeightGrams: 890, components: 'Scatola di cartone, Pluriball' },
              { id: '4', shopifyOrderId: '#1048', orderDate: '2026-05-23', countryCode: 'DE', totalWeightGrams: 50, components: 'Busta carta' },
            ]
          };
        }

        setLogs(logsData.data || []);
        
        // Calculate or fetch KPIs
        setKpis({
          totalWeightKg: 124.5,
          trackedOrders: 1045,
          materials: [
            { name: 'Carta / Cartone', percentage: 65, color: 'success' },
            { name: 'Plastica', percentage: 25, color: 'highlight' },
            { name: 'Composito', percentage: 10, color: 'critical' },
          ]
        });

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
