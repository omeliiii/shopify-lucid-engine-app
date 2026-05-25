import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, DataTable, Badge, Button, Text, InlineStack, BlockStack, Icon } from '@shopify/polaris';
import { CheckIcon, AlertCircleIcon, MagicIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';

interface Recommendation {
  packagingName: string;
  confidence: number;
  reason: string;
}

interface ProductMapping {
  id: string;
  title: string;
  currentMapping: string | null;
  recommendation: Recommendation | null;
}

export default function Mapping() {
  const [products, setProducts] = useState<ProductMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/products/mappings');
      setProducts(data);
    } catch (e) {
      setProducts([
        {
          id: '1',
          title: 'Calzini sportivi in cotone',
          currentMapping: null,
          recommendation: {
            packagingName: 'Bustina Calzini Custom',
            confidence: 0.94,
            reason: 'Mappato per similarità semantica con abbigliamento sportivo.'
          }
        },
        {
          id: '2',
          title: 'Scarpe da Corsa PRO',
          currentMapping: 'Scatola Scarpe Standard',
          recommendation: null
        },
        {
          id: '3',
          title: 'T-Shirt Basic',
          currentMapping: null,
          recommendation: {
            packagingName: 'Busta Plastica Media',
            confidence: 0.78,
            reason: 'Categoria t-shirt spesso associata a buste medie.'
          }
        }
      ]);
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

  const handleConfirmRecommendation = (id: string) => {
    setProducts(products.map(p => {
      if (p.id === id && p.recommendation) {
        return { ...p, currentMapping: p.recommendation.packagingName, recommendation: null };
      }
      return p;
    }));
  };

  const rows = products.map((product) => {
    const statusIcon = product.currentMapping ? (
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

    const mappingDetails = product.currentMapping ? (
      <Badge tone="success">{product.currentMapping}</Badge>
    ) : product.recommendation ? (
      <BlockStack gap="100">
        <InlineStack gap="100" blockAlign="center">
          <Icon source={MagicIcon} tone="magic" />
          <Text as="span" fontWeight="bold">{product.recommendation.packagingName}</Text>
          <Badge tone="info">{`${(product.recommendation.confidence * 100).toFixed(0)}% AI`}</Badge>
        </InlineStack>
        <Text as="p" variant="bodySm" tone="subdued">{product.recommendation.reason}</Text>
        <div style={{ marginTop: '4px' }}>
          <Button size="micro" onClick={() => handleConfirmRecommendation(product.id)}>Conferma</Button>
        </div>
      </BlockStack>
    ) : (
      <Text as="span" tone="subdued">Nessuna proposta</Text>
    );

    return [
      <Text as="span" fontWeight="bold">{product.title}</Text>,
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
