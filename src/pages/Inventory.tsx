import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Text, Button, ButtonGroup, Modal, Form, FormLayout, TextField, Icon, Box, BlockStack, InlineStack, EmptyState, Tabs, Banner } from '@shopify/polaris';
import { MagicIcon, ArrowLeftIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';
import { useToast } from '../utils/toast';
import { PolarisSelect } from '../components/PolarisSelect';
import { PackagingCard, type InventoryItem } from '../components/PackagingCard';


interface PackagingType {
  id: string;
  name: string;
  agnosticMaterial: string;
  category: 'PRIMARY' | 'TAPE' | 'FILLER';
  defaultGsm?: number;
  formulaType?: string;
  defaultOverlapFactor?: number;
  defaultLMm?: number;
  defaultWMm?: number;
  defaultHMm?: number;
}

export default function Inventory() {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [standardTypes, setStandardTypes] = useState<PackagingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [packagingTypeId, setPackagingTypeId] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [customGsm, setCustomGsm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PRIMARY' | 'TAPE' | 'FILLER'>('ALL');

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
      toast.error('Impossibile caricare l\'inventario');
      console.error('Failed to load inventory', e);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const bodyParams = {
      packagingTypeId,
      name,
      lMm: length ? Number(length) : null,
      wMm: width ? Number(width) : null,
      hMm: height ? Number(height) : null,
      customGsm: customGsm ? Number(customGsm) : null,
      role: 'PRIMARY'
    };

    try {
      if (editingItemId) {
        await apiFetch(`/packaging/inventory/${editingItemId}`, {
          method: 'PATCH',
          body: JSON.stringify(bodyParams)
        });
        toast.success('Imballaggio aggiornato');
      } else {
        await apiFetch('/packaging/inventory', {
          method: 'POST',
          body: JSON.stringify(bodyParams)
        });
        toast.success('Imballaggio aggiunto');
      }
      closeModal();
      loadData();
    } catch (e) {
      toast.error('Errore durante il salvataggio');
      console.error(e);
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setShowCustomForm(false);
    setEditingItemId(null);
  };

  const resetForm = () => {
    setName('');
    setLength('');
    setWidth('');
    setHeight('');
    setCustomGsm('');
    setEditingItemId(null);
    setShowCustomForm(false);
    setSelectedTab(0);
    setCategoryFilter('ALL');
    if (standardTypes.length > 0) {
      setPackagingTypeId(standardTypes[0].id);
      setLength(standardTypes[0].defaultLMm?.toString() || '');
      setWidth(standardTypes[0].defaultWMm?.toString() || '');
      setHeight(standardTypes[0].defaultHMm?.toString() || '');
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setName(item.name);
    setPackagingTypeId(item.packagingTypeId);
    setLength(item.lMm?.toString() || '');
    setWidth(item.wMm?.toString() || '');
    setHeight(item.hMm?.toString() || '');
    setCustomGsm(item.customGsm?.toString() || '');
    setEditingItemId(item.id);
    setShowCustomForm(true);
    setModalOpen(true);
  };

  const handleEditStandardType = (type: PackagingType) => {
    setName(type.name);
    setPackagingTypeId(type.id);
    setLength(type.defaultLMm?.toString() || '');
    setWidth(type.defaultWMm?.toString() || '');
    setHeight(type.defaultHMm?.toString() || '');
    setCustomGsm(type.defaultGsm?.toString() || '');
    setShowCustomForm(true);
  };

  const handleAcceptSuggested = async (item: InventoryItem) => {
    setSubmitting(true);
    try {
      await apiFetch(`/packaging/inventory/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true })
      });
      toast.success('Suggerimento accettato');
      loadData();
    } catch (e) {
      toast.error('Errore durante l\'accettazione');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptType = async (type: PackagingType) => {
    setSubmitting(true);
    const bodyParams = {
      packagingTypeId: type.id,
      name: type.name,
      lMm: type.defaultLMm ?? null,
      wMm: type.defaultWMm ?? null,
      hMm: type.defaultHMm ?? null,
      customGsm: null,
      role: 'PRIMARY'
    };
    try {
      await apiFetch('/packaging/inventory', { method: 'POST', body: JSON.stringify(bodyParams) });
      toast.success('Imballaggio aggiunto');
      closeModal();
      loadData();
    } catch (e) {
      toast.error('Errore durante l\'aggiunta');
      console.error(e);
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const optimistic = items;
    setItems(items.filter(i => i.id !== id));
    try {
      await apiFetch(`/packaging/inventory/${id}`, { method: 'DELETE' });
      toast.success('Imballaggio eliminato');
    } catch (e) {
      // rollback
      setItems(optimistic);
      toast.error('Errore durante l\'eliminazione');
      console.error(e);
    }
  };

  const filteredStandardTypes = standardTypes.filter(
    t => categoryFilter === 'ALL' || t.category === categoryFilter
  );

  const groupedTypes = filteredStandardTypes.reduce((acc, curr) => {
    if (!acc[curr.agnosticMaterial]) acc[curr.agnosticMaterial] = [];
    acc[curr.agnosticMaterial].push(curr);
    return acc;
  }, {} as Record<string, PackagingType[]>);

  const materialTabs = Object.keys(groupedTypes).map((material, index) => ({
    id: `tab-${index}`,
    content: material,
    accessibilityLabel: material,
    panelID: `panel-${index}`,
  }));

  const activeItems = items.filter(i => i.isActive && (!i.isAiSuggested || i.isConfirmed));
  const suggestedItems = items.filter(i => i.isAiSuggested && !i.isConfirmed);

  const hasTape = activeItems.some(i => i.packagingType?.category === 'TAPE');
  const hasFiller = activeItems.some(i => i.packagingType?.category === 'FILLER');
  const missingCategories: Array<{ key: 'TAPE' | 'FILLER'; label: string }> = [];
  if (!hasTape) missingCategories.push({ key: 'TAPE', label: 'nastro adesivo (tape)' });
  if (!hasFiller) missingCategories.push({ key: 'FILLER', label: 'materiale di riempimento (filler)' });

  const isCustomFormVisible = editingItemId !== null || showCustomForm;

  const modalTitle = editingItemId
    ? "Modifica Imballaggio"
    : showCustomForm
      ? "Personalizza Imballaggio"
      : "Aggiungi Imballaggio";

  return (
    <Page
      title="Inventario Imballaggi"
      primaryAction={{
        content: 'Aggiungi Imballaggio',
        onAction: () => { resetForm(); setModalOpen(true); }
      }}
    >
      <Layout>
        {!loading && activeItems.length > 0 && missingCategories.length > 0 && (
          <Layout.Section>
            <Banner
              tone="warning"
              title="Imballaggi mancanti"
              action={{
                content: 'Aggiungi imballaggio',
                onAction: () => { resetForm(); setModalOpen(true); },
              }}
            >
              <p>
                Non hai ancora aggiunto: <b>{missingCategories.map(m => m.label).join(' e ')}</b>.
                Senza questi elementi i calcoli di peso del pacco potrebbero essere incompleti.
              </p>
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <Card padding="0">
            {items.length === 0 && !loading ? (
              <EmptyState
                heading="Nessun imballaggio presente"
                action={{ content: 'Aggiungi', onAction: () => { resetForm(); setModalOpen(true); } }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p">Aggiungi il tuo primo imballaggio personalizzato.</Text>
              </EmptyState>
            ) : (
              <BlockStack gap="025">
                {suggestedItems.length > 0 && (
                  <Box background="bg-surface-warning" padding="400" borderRadius="200" borderColor="border-warning" borderWidth="025">
                    <BlockStack gap="400">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Icon source={MagicIcon} tone="warning" />
                        </div>
                        <Text as="span" variant="headingMd" tone="magic">Suggeriti dall'IA</Text>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {suggestedItems.map((item) => (
                          <PackagingCard
                            key={item.id}
                            item={item}
                            onEdit={handleEditItem}
                            onDelete={handleDeleteItem}
                            onAccept={handleAcceptSuggested}
                            isAiSuggested
                          />
                        ))}
                      </div>
                    </BlockStack>
                  </Box>
                )}

                {activeItems.length > 0 && (
                  <Box padding="400">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {activeItems.map((item) => (
                        <PackagingCard
                          key={item.id}
                          item={item}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                        />
                      ))}
                    </div>
                  </Box>
                )}
              </BlockStack>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        primaryAction={isCustomFormVisible ? {
          content: 'Salva',
          onAction: handleSubmit,
          loading: submitting,
        } : undefined}
        secondaryActions={[
          {
            content: 'Annulla',
            onAction: closeModal,
          },
        ]}
      >
        <Modal.Section>
          {!isCustomFormVisible && standardTypes.length > 0 ? (
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <Text as="span" variant="bodySm" tone="subdued">Categoria:</Text>
                <ButtonGroup variant="segmented">
                  {([
                    { value: 'ALL', label: 'Tutti' },
                    { value: 'PRIMARY', label: 'Primari' },
                    { value: 'TAPE', label: 'Tape' },
                    { value: 'FILLER', label: 'Filler' },
                  ] as const).map(opt => (
                    <Button
                      key={opt.value}
                      size="slim"
                      pressed={categoryFilter === opt.value}
                      onClick={() => { setCategoryFilter(opt.value); setSelectedTab(0); }}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </ButtonGroup>
              </InlineStack>
              {materialTabs.length > 0 ? (
                <Tabs tabs={materialTabs} selected={selectedTab} onSelect={setSelectedTab}>
                  <Box paddingBlockStart="400">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                      {groupedTypes[materialTabs[selectedTab]?.content]?.map(type => (
                        <Card key={type.id} padding="300" background="bg-surface-secondary">
                          <BlockStack gap="150">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">{type.name}</Text>
                            {type.defaultGsm && (
                              <Text as="span" tone="subdued" variant="bodySm">{type.defaultGsm} g/m²</Text>
                            )}
                            <InlineStack gap="100" align="end">
                              <Button size="micro" onClick={() => handleEditStandardType(type)}>Modifica</Button>
                              <Button size="micro" tone="success" onClick={() => handleAcceptType(type)} loading={submitting}>Aggiungi</Button>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      ))}
                    </div>
                  </Box>
                </Tabs>
              ) : (
                <Box paddingBlockStart="200" paddingBlockEnd="200">
                  <Text as="p" tone="subdued">Nessun tipo disponibile per la categoria selezionata.</Text>
                </Box>
              )}
              <Box borderBlockStartWidth="025" borderColor="border" paddingBlockStart="400">
                <Button onClick={() => setShowCustomForm(true)}>Crea imballaggio personalizzato</Button>
              </Box>
            </BlockStack>
          ) : (
            <BlockStack gap="400">
              {!editingItemId && (
                <Button
                  icon={ArrowLeftIcon}
                  variant="plain"
                  onClick={() => setShowCustomForm(false)}
                >
                  Torna ai tipi standard
                </Button>
              )}
              <Form onSubmit={handleSubmit}>
                <FormLayout>
                  <TextField
                    label="Nome Personalizzato"
                    value={name}
                    onChange={setName}
                    autoComplete="off"
                    placeholder="es. Bustina Calzini Custom"
                  />
                  <PolarisSelect
                    label="Tipo di Imballaggio"
                    options={standardTypes.map(t => ({ label: t.name, value: t.id }))}
                    value={packagingTypeId}
                    onChange={(val) => {
                      setPackagingTypeId(val);
                      const type = standardTypes.find(t => t.id === val);
                      if (type) {
                        setLength(type.defaultLMm?.toString() || '');
                        setWidth(type.defaultWMm?.toString() || '');
                        setHeight(type.defaultHMm?.toString() || '');
                      }
                    }}
                  />
                  <FormLayout.Group>
                    <TextField label="Lunghezza (mm)" value={length} onChange={setLength} type="number" autoComplete="off" />
                    <TextField label="Larghezza (mm)" value={width} onChange={setWidth} type="number" autoComplete="off" />
                    {standardTypes.find(t => t.id === packagingTypeId)?.defaultHMm !== null && (
                      <TextField label="Altezza (mm)" value={height} onChange={setHeight} type="number" autoComplete="off" />
                    )}
                    <TextField
                      label="Grammatura Personalizzata (g/m²)"
                      value={customGsm}
                      onChange={setCustomGsm}
                      type="number"
                      autoComplete="off"
                      helpText="Lascia vuoto per usare la grammatura standard del materiale"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </Form>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
