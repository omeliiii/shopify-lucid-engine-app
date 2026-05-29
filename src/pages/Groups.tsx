import { useState, useEffect, useCallback } from 'react';
import {
  Page, Layout, Card, Text, Button, Modal, Form, FormLayout,
  TextField, InlineStack, BlockStack, Badge, Box, Tabs, Banner,
  Tag, OptionList, Scrollable, EmptyState,
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';
import { useToast } from '../utils/toast';
import { PolarisSelect } from '../components/PolarisSelect';

interface ProductGroup {
  id: string;
  name: string;
  matchType: 'MANUAL' | 'PRODUCT_TYPE' | 'TAG';
  matchValue: string | null;
  members?: { shopifyProductId: number }[];
}

interface ShippingRuleRef {
  id: string;
  name: string;
  productGroupId: string | null;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  MANUAL: 'Manuale',
  PRODUCT_TYPE: 'Tipo Prodotto Shopify',
  TAG: 'Tag Prodotto',
};

export default function Groups() {
  const toast = useToast();

  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [rules, setRules] = useState<ShippingRuleRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Group form state
  const [groupName, setGroupName] = useState('');
  const [matchType, setMatchType] = useState<'MANUAL' | 'PRODUCT_TYPE' | 'TAG'>('PRODUCT_TYPE');
  const [matchValue, setMatchValue] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Shopify product list (manual matching)
  const [shopifyProducts, setShopifyProducts] = useState<{ label: string; value: string }[]>([]);
  const [syncingCatalog, setSyncingCatalog] = useState(false);

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; rulesInGroup: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter tabs
  const [selectedTab, setSelectedTab] = useState(0);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsData, rulesData] = await Promise.all([
        apiFetch('/products/groups'),
        apiFetch('/orders/shipping-rules'),
      ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setRules(Array.isArray(rulesData) ? rulesData : []);
    } catch (e) {
      toast.error('Impossibile caricare i gruppi');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await apiFetch('/products/shopify-list');
      if (data?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setShopifyProducts(data.data.map((p: any) => ({ label: p.title, value: p.id.toString() })));
      }
    } catch {
      // not critical for the page to load
    }
  }, []);

  useEffect(() => {
    loadGroups();
    loadProducts();
  }, [loadGroups, loadProducts]);

  const resetForm = () => {
    setGroupName('');
    setMatchType('PRODUCT_TYPE');
    setMatchValue('');
    setSelectedProductIds([]);
    setEditingGroupId(null);
  };

  const handleEdit = (group: ProductGroup) => {
    setGroupName(group.name);
    setMatchType(group.matchType);
    setMatchValue(group.matchValue || '');
    setSelectedProductIds(group.members?.map((m) => m.shopifyProductId.toString()) || []);
    setEditingGroupId(group.id);
    setGroupModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      toast.error('Inserisci un nome per il gruppo');
      return;
    }
    setSaving(true);
    const body = {
      name: groupName,
      matchType,
      matchValue: matchType !== 'MANUAL' ? matchValue : null,
      shopifyProductIds: matchType === 'MANUAL' ? selectedProductIds.map(Number) : undefined,
    };
    try {
      if (editingGroupId) {
        await apiFetch(`/products/groups/${editingGroupId}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast.success('Gruppo aggiornato');
      } else {
        await apiFetch('/products/groups', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Gruppo creato');
      }
      setGroupModalOpen(false);
      resetForm();
      await loadGroups();
    } catch (e) {
      toast.error(editingGroupId ? 'Errore durante l\'aggiornamento' : 'Errore durante la creazione');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (group: ProductGroup) => {
    const rulesInGroup = rules.filter((r) => r.productGroupId === group.id).length;
    setPendingDelete({ id: group.id, name: group.name, rulesInGroup });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/products/groups/${pendingDelete.id}`, { method: 'DELETE' });
      toast.success('Gruppo eliminato');
      await loadGroups();
    } catch (e) {
      toast.error('Errore durante l\'eliminazione');
      console.error(e);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setPendingDelete(null);
    }
  };

  const handleSyncFromCatalog = async () => {
    setSyncingCatalog(true);
    try {
      await apiFetch('/products/groups/sync-from-catalog', { method: 'POST' });
      toast.success('Tipi importati dal catalogo Shopify');
      await loadGroups();
    } catch (e) {
      toast.error('Errore durante l\'importazione');
      console.error(e);
    } finally {
      setSyncingCatalog(false);
    }
  };

  // ── Filter groups by match type tab ──
  const matchTypeFilter: Record<number, 'MANUAL' | 'PRODUCT_TYPE' | 'TAG' | undefined> = {
    0: undefined,
    1: 'PRODUCT_TYPE',
    2: 'TAG',
    3: 'MANUAL',
  };
  const filter = matchTypeFilter[selectedTab];
  const visibleGroups = filter ? groups.filter((g) => g.matchType === filter) : groups;

  const tabs = [
    { id: 'all', content: `Tutti (${groups.length})` },
    { id: 'product-type', content: `Tipo (${groups.filter((g) => g.matchType === 'PRODUCT_TYPE').length})` },
    { id: 'tag', content: `Tag (${groups.filter((g) => g.matchType === 'TAG').length})` },
    { id: 'manual', content: `Manuali (${groups.filter((g) => g.matchType === 'MANUAL').length})` },
  ];

  return (
    <Page
      title="Gruppi Prodotto"
      subtitle="I gruppi servono per applicare regole di spedizione e mappature di imballaggio a più prodotti contemporaneamente."
      primaryAction={{
        content: 'Nuovo Gruppo',
        onAction: () => { resetForm(); setGroupModalOpen(true); },
      }}
      secondaryActions={[
        {
          content: 'Importa Tipi dal Catalogo',
          onAction: handleSyncFromCatalog,
          loading: syncingCatalog,
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            <p>
              Usa <b>Tipo Prodotto Shopify</b> per un matching automatico basato sul campo
              <code>product_type</code> di Shopify. <b>Tag</b> per matching automatico tramite tag.
              <b> Selezione Manuale</b> per costruire un gruppo a mano scegliendo i singoli prodotti.
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box padding="400">
                {visibleGroups.length === 0 && !loading ? (
                  <EmptyState
                    heading={selectedTab === 0 ? 'Nessun gruppo presente' : 'Nessun gruppo in questa categoria'}
                    action={
                      selectedTab === 0
                        ? { content: 'Crea il primo gruppo', onAction: () => { resetForm(); setGroupModalOpen(true); } }
                        : undefined
                    }
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      I gruppi permettono di raggruppare prodotti per assegnare regole o
                      mappature in modalità bulk.
                    </p>
                  </EmptyState>
                ) : (
                  <BlockStack gap="400">
                    {visibleGroups.map((group) => {
                      const rulesUsingGroup = rules.filter((r) => r.productGroupId === group.id);
                      return (
                        <Card key={group.id} padding="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="200">
                              <InlineStack gap="200" blockAlign="center">
                                <Text as="h3" variant="headingMd">{group.name}</Text>
                                <Badge tone="info">{MATCH_TYPE_LABELS[group.matchType]}</Badge>
                              </InlineStack>
                              {group.matchValue && (
                                <Text as="p" tone="subdued">
                                  Valore di match: <b>{group.matchValue}</b>
                                </Text>
                              )}
                              {group.matchType === 'MANUAL' && group.members && (
                                <Text as="p" tone="subdued">
                                  {group.members.length} prodotti assegnati manualmente
                                </Text>
                              )}
                              {rulesUsingGroup.length > 0 ? (
                                <InlineStack gap="200">
                                  <Text as="span" variant="bodySm" tone="subdued">Usato in:</Text>
                                  {rulesUsingGroup.map((r) => (
                                    <Tag key={r.id}>{r.name}</Tag>
                                  ))}
                                </InlineStack>
                              ) : (
                                <Text as="p" variant="bodySm" tone="caution">
                                  Nessuna regola associata a questo gruppo
                                </Text>
                              )}
                            </BlockStack>
                            <InlineStack gap="200">
                              <Button icon={EditIcon} onClick={() => handleEdit(group)}>Modifica</Button>
                              <Button tone="critical" icon={DeleteIcon} onClick={() => askDelete(group)}>Elimina</Button>
                            </InlineStack>
                          </InlineStack>
                        </Card>
                      );
                    })}
                  </BlockStack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* ── Group create/edit modal ── */}
      <Modal
        open={groupModalOpen}
        onClose={() => { setGroupModalOpen(false); resetForm(); }}
        title={editingGroupId ? 'Modifica Gruppo' : 'Nuovo Gruppo'}
        primaryAction={{ content: 'Salva', onAction: handleSubmit, loading: saving }}
        secondaryActions={[{ content: 'Annulla', onAction: () => { setGroupModalOpen(false); resetForm(); } }]}
      >
        <Modal.Section>
          <Form onSubmit={handleSubmit}>
            <FormLayout>
              <TextField
                label="Nome Gruppo"
                value={groupName}
                onChange={setGroupName}
                autoComplete="off"
                placeholder="es. Abbigliamento, Elettronica fragile…"
              />
              <PolarisSelect
                label="Tipo di Match"
                options={[
                  { label: 'Tipo Prodotto Shopify (automatico)', value: 'PRODUCT_TYPE' },
                  { label: 'Tag Prodotto (automatico)', value: 'TAG' },
                  { label: 'Selezione Manuale', value: 'MANUAL' },
                ]}
                value={matchType}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(v) => setMatchType(v as any)}
              />
              {matchType !== 'MANUAL' ? (
                <TextField
                  label={matchType === 'PRODUCT_TYPE' ? 'Tipo Prodotto (es. Electronics, Clothing)' : 'Tag (es. fragile, heavy)'}
                  value={matchValue}
                  onChange={setMatchValue}
                  autoComplete="off"
                  helpText={
                    matchType === 'PRODUCT_TYPE'
                      ? 'Deve corrispondere esattamente al "Product Type" configurato in Shopify.'
                      : 'Deve corrispondere esattamente a un tag del prodotto Shopify.'
                  }
                />
              ) : (
                <Box paddingBlockStart="200">
                  <Text as="h3" variant="headingSm">Seleziona Prodotti</Text>
                  <Box minHeight="200px" paddingBlockStart="200">
                    <Scrollable style={{ height: '200px' }} shadow>
                      <OptionList
                        title=""
                        onChange={setSelectedProductIds}
                        options={shopifyProducts}
                        selected={selectedProductIds}
                        allowMultiple
                      />
                    </Scrollable>
                  </Box>
                </Box>
              )}
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      {/* ── Delete confirmation modal ── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setPendingDelete(null); }}
        title="Conferma eliminazione"
        primaryAction={{
          content: 'Elimina',
          destructive: true,
          loading: deleting,
          onAction: handleConfirmDelete,
        }}
        secondaryActions={[
          { content: 'Annulla', onAction: () => { setDeleteModalOpen(false); setPendingDelete(null); } },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text as="p">
              Vuoi davvero eliminare il gruppo{' '}
              <Text as="span" fontWeight="bold">{pendingDelete?.name}</Text>?
            </Text>
            {pendingDelete && pendingDelete.rulesInGroup > 0 && (
              <Banner tone="warning">
                <p>
                  Questo gruppo è utilizzato da <b>{pendingDelete.rulesInGroup}</b>{' '}
                  {pendingDelete.rulesInGroup === 1 ? 'regola' : 'regole'}. Eliminandolo, queste
                  regole diventeranno catch-all.
                </p>
              </Banner>
            )}
            <Text as="p" tone="subdued" variant="bodySm">
              Questa azione non può essere annullata.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
