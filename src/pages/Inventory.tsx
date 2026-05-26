import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Button, Modal, Form, FormLayout, TextField, Badge, InlineStack, BlockStack, EmptyState, Icon, Box } from '@shopify/polaris';
import { DeleteIcon, EditIcon, CheckIcon, MagicIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';
import { PolarisSelect } from '../components/PolarisSelect';

interface InventoryItem {
  id: string;
  packagingTypeId: string;
  name: string;
  lMm: number | null;
  wMm: number | null;
  hMm: number | null;
  customGsm: number | null;
  calculatedUnitWeightGrams: number;
  role: 'PRIMARY' | 'SECONDARY' | 'FILLER';
  isActive: boolean;
  packagingType: {
    id: string;
    name: string;
    agnosticMaterial: string;
    formulaType: string;
    defaultGsm: number;
  };
}

interface PackagingType {
  id: string;
  name: string;
  agnosticMaterial: string;
  defaultGsm?: number;
  formulaType?: string;
  defaultOverlapFactor?: number;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [standardTypes, setStandardTypes] = useState<PackagingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [packagingTypeId, setPackagingTypeId] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/packaging/inventory');
      setItems(data);
      const typesData = await apiFetch('/packaging/types');
      setStandardTypes(typesData);
      if (typesData.length > 0) {
        setPackagingTypeId(typesData[0].id);
      }
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
    const bodyParams = {
      packagingTypeId,
      name,
      lMm: Number(length),
      wMm: Number(width),
      hMm: Number(height),
      customGsm: null,
      role: 'PRIMARY'
    };

    try {
      if (editingItemId) {
        await apiFetch(`/packaging/inventory/${editingItemId}`, {
          method: 'PATCH',
          body: JSON.stringify(bodyParams)
        });
      } else {
        await apiFetch('/packaging/inventory', {
          method: 'POST',
          body: JSON.stringify(bodyParams)
        });
      }
      setModalOpen(false);
      loadData();
    } catch (e) {
      setModalOpen(false);
    } finally {
      setSubmitting(false);
      setEditingItemId(null);
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



  const handleEditItem = (item: InventoryItem) => {
    setName(item.name);
    setPackagingTypeId(item.packagingTypeId);
    setLength(item.lMm?.toString() || '');
    setWidth(item.wMm?.toString() || '');
    setHeight(item.hMm?.toString() || '');
    setEditingItemId(item.id);
    setModalOpen(true);
  };

  const handleAcceptType = async (type: PackagingType) => {
    setSubmitting(true);
    const bodyParams = {
      packagingTypeId: type.id,
      name: type.name,
      lMm: 0,
      wMm: 0,
      hMm: 0,
      customGsm: null,
      role: 'PRIMARY'
    };
    try {
      await apiFetch('/packaging/inventory', { method: 'POST', body: JSON.stringify(bodyParams) });
      setModalOpen(false);
      loadData();
    } catch (e) {
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const groupedTypes = standardTypes.reduce((acc, curr) => {
    if (!acc[curr.agnosticMaterial]) acc[curr.agnosticMaterial] = [];
    acc[curr.agnosticMaterial].push(curr);
    return acc;
  }, {} as Record<string, PackagingType[]>);

  const handleDeleteItem = async (id: string) => {
    try {
      await apiFetch(`/packaging/inventory/${id}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== id));
    } catch (e) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const resetForm = () => {
    setName('');
    if (standardTypes.length > 0) setPackagingTypeId(standardTypes[0].id);
    setLength('');
    setWidth('');
    setHeight('');
    setEditingItemId(null);
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

        <Layout.Section>
          <Card padding="0">
            {items.length === 0 && !loading ? (
              <EmptyState
                heading="Nessun imballaggio presente"
                action={{ content: 'Aggiungi', onAction: () => { resetForm(); setModalOpen(true); } }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Aggiungi il tuo primo imballaggio personalizzato.</p>
              </EmptyState>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', padding: '16px' }}>
                {items.map((item) => (
                  <Card key={item.id} padding="0">
                    <img 
                      src={getMaterialImage(item.packagingType?.agnosticMaterial || 'PAPER')} 
                      alt={item.packagingType?.agnosticMaterial} 
                      style={{ width: '100%', height: '160px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }} 
                    />
                    <Box padding="400">
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">{item.name}</Text>
                        <InlineStack gap="200" align="space-between">
                          <Badge tone={item.packagingType?.agnosticMaterial === 'PAPER' ? 'success' : 'info'}>{item.packagingType?.agnosticMaterial}</Badge>
                          <Text as="span" tone="subdued" variant="bodySm">{item.calculatedUnitWeightGrams}g</Text>
                        </InlineStack>
                        <Text as="span" tone="subdued" variant="bodySm">Dimensioni: {`${item.lMm}x${item.wMm}x${item.hMm} mm`}</Text>
                        <div style={{ paddingTop: '12px' }}>
                          <InlineStack gap="200" align="space-between">
                            <Button size="micro" tone="critical" icon={DeleteIcon} onClick={() => handleDeleteItem(item.id)}>Elimina</Button>
                            <Button size="micro" icon={EditIcon} onClick={() => handleEditItem(item)}>Modifica</Button>
                          </InlineStack>
                        </div>
                      </BlockStack>
                    </Box>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItemId ? "Modifica Imballaggio" : "Aggiungi Imballaggio Personalizzato"}
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
          {!editingItemId && standardTypes.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Imballaggi Standard</Text>
                {Object.entries(groupedTypes).map(([material, types]) => (
                  <BlockStack key={material} gap="200">
                    <Text as="h4" variant="headingSm" tone="subdued">{material}</Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {types.map(type => (
                        <Card key={type.id} padding="200" background="bg-surface-secondary">
                          <BlockStack gap="200">
                            <Text as="span" fontWeight="bold">{type.name}</Text>
                            <InlineStack gap="100" align="end">
                              <Button size="micro" onClick={() => {
                                setName(type.name);
                                setPackagingTypeId(type.id);
                                document.getElementById('custom-form')?.scrollIntoView({ behavior: 'smooth' });
                              }}>Modifica</Button>
                              <Button size="micro" tone="success" onClick={() => handleAcceptType(type)}>Accetta</Button>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      ))}
                    </div>
                  </BlockStack>
                ))}
              </BlockStack>
              <div style={{ marginTop: '24px', marginBottom: '8px', borderBottom: '1px solid #e1e3e5' }}></div>
              <Text as="h3" variant="headingMd" id="custom-form">Personalizza Imballaggio</Text>
            </div>
          )}

          <Form onSubmit={handleSubmit}>
            <FormLayout>
              <TextField label="Nome Personalizzato" value={name} onChange={setName} autoComplete="off" placeholder="es. Bustina Calzini Custom" />
              <PolarisSelect
                label="Tipo di Imballaggio"
                options={standardTypes.map(t => ({ label: t.name, value: t.id }))}
                value={packagingTypeId}
                onChange={setPackagingTypeId}
              />
              <FormLayout.Group>
                <TextField label="Lunghezza (mm)" value={length} onChange={setLength} type="number" autoComplete="off" />
                <TextField label="Larghezza (mm)" value={width} onChange={setWidth} type="number" autoComplete="off" />
                <TextField label="Altezza (mm)" value={height} onChange={setHeight} type="number" autoComplete="off" />
              </FormLayout.Group>
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
