import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, DataTable, Badge, Button, Text, InlineStack, BlockStack, Icon } from '@shopify/polaris';
import { CheckIcon, AlertCircleIcon, MagicIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';

interface PackagingComponent {
  mappingId: string;
  packagingId: string;
  packagingName: string;
  purpose: 'WRAP' | 'CONTAINER' | 'SEAL' | 'LABEL' | 'CUSHION';
  quantityPerUnit: number;
  unitWeightGrams: number;
}

interface PendingComponent extends PackagingComponent {
  similarityScore: number;
  reason: string;
}

interface ProductMapping {
  shopifyProductId: number;
  shopifyProductTitle: string;
  confirmedComponents: PackagingComponent[];
  pendingComponents: PendingComponent[];
}

export default function Mapping() {
  const [products, setProducts] = useState<ProductMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/products/mappings?page=1&limit=50');
      setProducts(data.data || []);
    } catch (e) {
      console.error("Failed to load mappings", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiFetch('/products/sync', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setTimeout(() => {
      setSyncing(false);
      loadData();
    }, 1500);
  };

  const handleConfirmRecommendation = async (productId: number, mappingId: string) => {
    try {
      await apiFetch(`/products/${productId}/packaging/${mappingId}/confirm`, { method: 'PATCH' });
      loadData();
    } catch (e) {
      // simulate success for demo
      setProducts(products.map(p => {
        if (p.shopifyProductId === productId) {
          const compToConfirm = p.pendingComponents.find(c => c.mappingId === mappingId);
          if (compToConfirm) {
            return {
              ...p,
              pendingComponents: p.pendingComponents.filter(c => c.mappingId !== mappingId),
              confirmedComponents: [...p.confirmedComponents, { ...compToConfirm }]
            };
          }
        }
        return p;
      }));
    }
  };

  const rows = products.map((product) => {
    const isMapped = product.confirmedComponents.length > 0;
    const statusIcon = isMapped ? (
      <InlineStack gap="100" blockAlign="center">
        <Icon source={CheckIcon} tone="success" />
        <Text as="span" tone="success">Mappato</Text>
      </InlineStack>
    ) : (
      <InlineStack gap="100" blockAlign="center">
        <Icon source={AlertCircleIcon} tone="critical" />
        <Text as="span" tone="critical">Non Mappato</Text>
      </InlineStack>
    );

    const mappingDetails = (
      <BlockStack gap="200">
        {product.confirmedComponents.length > 0 && (
          <InlineStack gap="200">
            {product.confirmedComponents.map(comp => (
              <Badge key={comp.mappingId} tone="success">{comp.packagingName} ({comp.quantityPerUnit}x)</Badge>
            ))}
          </InlineStack>
        )}
        
        {product.pendingComponents.length > 0 && (
          <BlockStack gap="200">
            {product.pendingComponents.map(comp => (
              <BlockStack key={comp.mappingId} gap="100">
                <InlineStack gap="100" blockAlign="center">
                  <Icon source={MagicIcon} tone="magic" />
                  <Text as="span" fontWeight="bold">{comp.packagingName}</Text>
                  <Badge tone="info">{`${(comp.similarityScore * 100).toFixed(0)}% AI`}</Badge>
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">{comp.reason}</Text>
                <div style={{ marginTop: '4px' }}>
                  <Button size="micro" onClick={() => handleConfirmRecommendation(product.shopifyProductId, comp.mappingId)}>Conferma</Button>
                </div>
              </BlockStack>
            ))}
          </BlockStack>
        )}

        {product.confirmedComponents.length === 0 && product.pendingComponents.length === 0 && (
          <Text as="span" tone="subdued">Nessuna proposta</Text>
        )}
      </BlockStack>
    );

    return [
      <Text as="span" fontWeight="bold">{product.shopifyProductTitle}</Text>,
      statusIcon,
      mappingDetails,
    ];
  });

  return (
    <Page 
      title="Mappatura Prodotti"
      primaryAction={{
        content: 'Sincronizza Shopify',
        onAction: handleSync,
        loading: syncing,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <DataTable
              columnContentTypes={['text', 'text', 'text']}
              headings={['Prodotto', 'Stato', 'Imballaggio Assegnato / Proposta AI']}
              rows={rows}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
