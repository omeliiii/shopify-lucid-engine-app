import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Button, Modal, Form, FormLayout, TextField, Select, Checkbox, InlineStack, BlockStack } from '@shopify/polaris';
import { apiFetch } from '../utils/api';

interface ShippingRule {
  id: string;
  name: string;
  maxItems: number;
  isActive: boolean;
}

export default function ShippingRules() {
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [maxItems, setMaxItems] = useState('5');
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/orders/shipping-rules');
      setRules(data);
    } catch (e) {
      setRules([
        { id: '1', name: 'Box Calzini Fino a 5 Articoli', maxItems: 5, isActive: true },
        { id: '2', name: 'Scatola Grande (> 5 Articoli)', maxItems: 20, isActive: false },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = () => {
    setRules([...rules, { id: Math.random().toString(), name, maxItems: Number(maxItems), isActive }]);
    setModalOpen(false);
  };

  const toggleActive = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <Page 
      title="Regole di Spedizione"
      primaryAction={{
        content: 'Nuova Regola',
        onAction: () => setModalOpen(true)
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <ResourceList
              items={rules}
              renderItem={(item) => (
                <ResourceItem id={item.id} onClick={() => {}}>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="h3" variant="bodyMd" fontWeight="bold">{item.name}</Text>
                      <Text as="p" tone="subdued">Fino a {item.maxItems} articoli per pacco.</Text>
                    </BlockStack>
                    <Button onClick={() => toggleActive(item.id)} tone={item.isActive ? "critical" : "success"}>
                      {item.isActive ? "Disattiva" : "Attiva"}
                    </Button>
                  </InlineStack>
                </ResourceItem>
              )}
            />
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuova Regola di Imballaggio"
        primaryAction={{ content: 'Salva', onAction: handleSubmit }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <Form onSubmit={handleSubmit}>
            <FormLayout>
              <TextField label="Nome Regola" value={name} onChange={setName} autoComplete="off" />
              <TextField label="Numero massimo di articoli" type="number" value={maxItems} onChange={setMaxItems} autoComplete="off" />
              <Checkbox label="Regola Attiva" checked={isActive} onChange={setIsActive} />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
