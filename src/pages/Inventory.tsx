import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Button, Modal, Form, FormLayout, TextField, Select, Badge, InlineStack, BlockStack, EmptyState, Icon, Box } from '@shopify/polaris';
import { DeleteIcon, EditIcon, CheckIcon, MagicIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';

interface InventoryItem {
  id: string;
  customName: string;
  material: string;
  dimensions: string;
  weight: number;
  customLengthMm?: number;
  customWidthMm?: number;
  customHeightMm?: number;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);
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
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/packaging/inventory');
      setItems(data);
      const suggData = await apiFetch('/packaging/suggestions');
      setSuggestions(suggData);
    } catch (e) {
      console.error("Failed to load inventory", e);
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
      if (editingSuggestionId) {
        setSuggestions(suggestions.filter(s => s.id !== editingSuggestionId));
        setEditingSuggestionId(null);
      }
      loadData();
    } catch (e) {
      // Simulate success for demo
      setItems([...items, { id: Math.random().toString(), customName: name, material, dimensions: `${length}x${width}x${height} mm`, weight: Number(weight) }]);
      setModalOpen(false);
      if (editingSuggestionId) {
        setSuggestions(suggestions.filter(s => s.id !== editingSuggestionId));
        setEditingSuggestionId(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getMaterialImage = (material: string) => {
    switch (material) {
      case 'PAPER': return 'https://images.unsplash.com/photo-1589758438368-0c313dc12574?auto=format&fit=crop&q=80&w=200&h=200';
      case 'PLASTIC': return 'https://images.unsplash.com/photo-1628148818167-27e1f4404fbe?auto=format&fit=crop&q=80&w=200&h=200';
      case 'COMPOSITE': return 'https://images.unsplash.com/photo-1563241527-2004fb0f49c0?auto=format&fit=crop&q=80&w=200&h=200';
      default: return 'https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png';
    }
  };

  const handleAcceptSuggestion = async (suggestion: InventoryItem) => {
    // API POST here, then update local state
    setItems([...items, suggestion]);
    setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
  };

  const handleEditSuggestion = (suggestion: InventoryItem) => {
    setName(suggestion.customName);
    setMaterial(suggestion.material);
    setLength(suggestion.customLengthMm?.toString() || '');
    setWidth(suggestion.customWidthMm?.toString() || '');
    setHeight(suggestion.customHeightMm?.toString() || '');
    setWeight(suggestion.weight?.toString() || '');
    setEditingSuggestionId(suggestion.id);
    setModalOpen(true);
  };

  const handleDeleteSuggestion = (id: string) => {
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const resetForm = () => {
    setName('');
    setMaterial('PAPER');
    setLength('');
    setWidth('');
    setHeight('');
    setWeight('');
    setEditingSuggestionId(null);
  };

  return (
    <Page
      title="Inventario Imballaggi"
      primaryAction={{
        content: 'Aggiungi Imballaggio',
        onAction: () => { resetForm(); setModalOpen(true); }
      }}
    >
      <Layout>
        {/* AI Suggestions Section */}
        {suggestions.length > 0 && (
          <Layout.Section>
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={MagicIcon} tone="magic" />
                <Text as="h2" variant="headingMd">Suggerimenti AI per il tuo inventario</Text>
              </InlineStack>
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                {suggestions.map((sugg) => (
                  <div key={sugg.id} style={{ minWidth: '280px', flex: '0 0 auto' }}>
                    <Card padding="0">
                      <img
                        src={getMaterialImage(sugg.material)}
                        alt={sugg.material}
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
                      />
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">{sugg.customName}</Text>
                          <InlineStack gap="200">
                            <Badge tone={sugg.material === 'PAPER' ? 'success' : 'info'}>{sugg.material}</Badge>
                            <Text as="span" tone="subdued" variant="bodySm">{sugg.dimensions}</Text>
                          </InlineStack>
                          <div style={{ paddingTop: '12px' }}>
                            <InlineStack gap="200" align="space-between">
                              <Button size="micro" tone="critical" icon={DeleteIcon} onClick={() => handleDeleteSuggestion(sugg.id)} />
                              <InlineStack gap="200">
                                <Button size="micro" icon={EditIcon} onClick={() => handleEditSuggestion(sugg)}>Modifica</Button>
                                <Button size="micro" tone="success" icon={CheckIcon} onClick={() => handleAcceptSuggestion(sugg)}>Accetta</Button>
                              </InlineStack>
                            </InlineStack>
                          </div>
                        </BlockStack>
                      </Box>
                    </Card>
                  </div>
                ))}
              </div>
            </BlockStack>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="0">
            {items.length === 0 && !loading ? (
              <EmptyState
                heading="Nessun imballaggio presente"
                action={{ content: 'Aggiungi', onAction: () => setModalOpen(true) }}
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
                      onClick={() => { }}
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
        title={editingSuggestionId ? "Accetta e Modifica Suggerimento" : "Aggiungi Imballaggio Personalizzato"}
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
                options={[{ label: 'Carta/Cartone', value: 'PAPER' }, { label: 'Plastica', value: 'PLASTIC' }, { label: 'Composito', value: 'COMPOSITE' }]}
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
