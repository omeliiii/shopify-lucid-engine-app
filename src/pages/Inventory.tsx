import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Button, Modal, Form, FormLayout, TextField, Select, Badge, InlineStack, BlockStack, EmptyState } from '@shopify/polaris';
import { apiFetch } from '../utils/api';

interface InventoryItem {
  id: string;
  customName: string;
  material: string;
  dimensions: string;
  weight: number;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [material, setMaterial] = useState('PAPER');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/packaging/inventory');
      setItems(data);
    } catch (e) {
      console.warn("Using mock data for inventory");
      setItems([
        { id: '1', customName: 'Bustina Calzini Custom', material: 'PAPER', dimensions: '150x100x20 mm', weight: 7.92 },
        { id: '2', customName: 'Scatola Standard', material: 'COMPOSITE', dimensions: '300x200x100 mm', weight: 150 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/packaging/inventory', {
        method: 'POST',
        body: JSON.stringify({
          customName: name,
          material,
          customLengthMm: Number(length),
          customWidthMm: Number(width),
          customHeightMm: Number(height),
          customWeightGrams: Number(weight)
        })
      });
      setModalOpen(false);
      loadData();
    } catch (e) {
      // Simulate success for demo
      setItems([...items, { id: Math.random().toString(), customName: name, material, dimensions: `${length}x${width}x${height} mm`, weight: Number(weight) }]);
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page 
      title="Inventario Imballaggi" 
      primaryAction={{
        content: 'Aggiungi Imballaggio',
        onAction: () => setModalOpen(true)
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {items.length === 0 && !loading ? (
              <EmptyState
                heading="Nessun imballaggio presente"
                action={{content: 'Aggiungi', onAction: () => setModalOpen(true)}}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Aggiungi il tuo primo imballaggio personalizzato.</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: 'imballaggio', plural: 'imballaggi' }}
                items={items}
                loading={loading}
                renderItem={(item) => {
                  return (
                    <ResourceItem
                      id={item.id}
                      onClick={() => {}}
                    >
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {item.customName}
                          </Text>
                          <Text variant="bodySm" as="p" tone="subdued">
                            Dimensioni: {item.dimensions} | Peso: {item.weight}g
                          </Text>
                        </BlockStack>
                        <Badge tone={item.material === 'PAPER' ? 'success' : 'info'}>{item.material}</Badge>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Aggiungi Imballaggio Personalizzato"
        primaryAction={{
          content: 'Salva',
          onAction: handleSubmit,
          loading: submitting,
        }}
        secondaryActions={[
          {
            content: 'Annulla',
            onAction: () => setModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <Form onSubmit={handleSubmit}>
            <FormLayout>
              <TextField label="Nome Personalizzato" value={name} onChange={setName} autoComplete="off" placeholder="es. Bustina Calzini Custom" />
              <Select
                label="Materiale"
                options={[{label: 'Carta/Cartone', value: 'PAPER'}, {label: 'Plastica', value: 'PLASTIC'}, {label: 'Composito', value: 'COMPOSITE'}]}
                value={material}
                onChange={setMaterial}
              />
              <FormLayout.Group>
                <TextField label="Lunghezza (mm)" value={length} onChange={setLength} type="number" autoComplete="off" />
                <TextField label="Larghezza (mm)" value={width} onChange={setWidth} type="number" autoComplete="off" />
                <TextField label="Altezza (mm)" value={height} onChange={setHeight} type="number" autoComplete="off" />
              </FormLayout.Group>
              <TextField label="Peso a vuoto (g)" value={weight} onChange={setWeight} type="number" autoComplete="off" />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
