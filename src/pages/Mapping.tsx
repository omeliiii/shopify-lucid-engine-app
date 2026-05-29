import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  Layout,
  Card,
  Badge,
  Button,
  Text,
  InlineStack,
  BlockStack,
  Box,
  EmptyState,
  Modal,
  FormLayout,
  TextField,
  Thumbnail,
  SkeletonBodyText,
  Pagination,
  Checkbox,
  Banner,
  IndexTable,
  IndexFilters,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { DeleteIcon, PlusIcon, CheckIcon } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useToast } from '../utils/toast';
import { PolarisSelect } from '../components/PolarisSelect';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PackagingItem {
  id: string;
  name: string;
}

interface PackagingComponent {
  mappingId: string;
  packagingId: string;
  packagingName: string;
  packagingMaterial?: string;
  packagingImageUrl?: string;
  purpose: 'WRAP' | 'CONTAINER' | 'SEAL' | 'LABEL' | 'CUSHION';
  quantityPerUnit: number;
  unitWeightGrams: number;
}

interface PendingComponent extends PackagingComponent {
  similarityScore: number;
  reason: string;
}

type MappingStatus = 'mapped' | 'pending' | 'unmapped';

interface MergedProduct {
  shopifyProductId: number;
  title: string;
  imageUrl?: string;
  status: MappingStatus;
  confirmedComponents: PackagingComponent[];
  pendingComponents: PendingComponent[];
  groups?: { id: string; name: string }[];
}

interface MergedViewMeta {
  total: number;
  page: number;
  limit: number;
  totalMapped: number;
  totalPending: number;
  totalUnmapped: number;
}

interface ProductGroup {
  id: string;
  name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS = [
  { label: 'Contenitore', value: 'CONTAINER' },
  { label: 'Involucro', value: 'WRAP' },
  { label: 'Sigillo', value: 'SEAL' },
  { label: 'Etichetta', value: 'LABEL' },
  { label: 'Cuscinetto', value: 'CUSHION' },
];

const STATUS_FILTER_MAP: Record<number, MappingStatus | undefined> = {
  0: undefined,    // "Tutti"
  1: 'mapped',     // "Mappati"
  2: 'pending',    // "Da Revisionare"
  3: 'unmapped',   // "Senza Imballaggio"
};

const PAGE_LIMIT = 25;

function purposeLabel(purpose: string): string {
  return PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label ?? purpose;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusCell({ status }: { status: MappingStatus }) {
  if (status === 'mapped') return <Badge tone="success">Mappato</Badge>;
  if (status === 'pending') return <Badge tone="info">Suggerimento AI</Badge>;
  return <Badge tone="critical">Non Mappato</Badge>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Mapping() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<MergedProduct[]>([]);
  const [meta, setMeta] = useState<MergedViewMeta>({
    total: 0, page: 1, limit: PAGE_LIMIT,
    totalMapped: 0, totalPending: 0, totalUnmapped: 0,
  });
  const [packagingOptions, setPackagingOptions] = useState<PackagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // IndexFilters query + mode
  const [queryValue, setQueryValue] = useState('');
  const [queryDebounced, setQueryDebounced] = useState('');
  const { mode, setMode } = useSetIndexFiltersMode();

  // Add packaging modal (single product)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<MergedProduct | null>(null);
  const [addForm, setAddForm] = useState({
    packagingId: '',
    purpose: 'CONTAINER',
    quantityPerUnit: '1',
    applyToGroups: [] as string[],
  });
  const [addLoading, setAddLoading] = useState(false);

  // Delete/reject confirm modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ productId: number; mappingId: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk packaging-by-group modal
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [bulkGroupModalOpen, setBulkGroupModalOpen] = useState(false);
  const [bulkGroupForm, setBulkGroupForm] = useState({
    groupId: '',
    packagingId: '',
    purpose: 'CONTAINER',
    quantityPerUnit: '1',
    overwrite: false,
  });
  const [bulkGroupLoading, setBulkGroupLoading] = useState(false);

  // Bulk packaging-by-selection modal (new — IndexTable bulk action)
  const [bulkSelectionModalOpen, setBulkSelectionModalOpen] = useState(false);
  const [bulkSelectionForm, setBulkSelectionForm] = useState({
    packagingId: '',
    purpose: 'CONTAINER',
    quantityPerUnit: '1',
  });
  const [bulkSelectionLoading, setBulkSelectionLoading] = useState(false);

  // Bulk confirm-suggestions loading
  const [bulkConfirming, setBulkConfirming] = useState(false);

  // ── Debounce search ───────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryDebounced(queryValue);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [queryValue]);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = STATUS_FILTER_MAP[selectedTab];
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_LIMIT));
      if (statusParam) params.set('status', statusParam);
      if (queryDebounced.trim()) params.set('search', queryDebounced.trim());

      const [mergedResult, inventoryResult] = await Promise.allSettled([
        apiFetch(`/products/merged-view?${params.toString()}`),
        apiFetch('/packaging/inventory'),
      ]);

      if (mergedResult.status === 'fulfilled') {
        setProducts(mergedResult.value?.data ?? []);
        setMeta(mergedResult.value?.meta ?? {
          total: 0, page: 1, limit: PAGE_LIMIT,
          totalMapped: 0, totalPending: 0, totalUnmapped: 0,
        });
      } else {
        setProducts([]);
        toast.error('Impossibile caricare i prodotti');
      }

      if (inventoryResult.status === 'fulfilled') {
        setPackagingOptions(inventoryResult.value ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedTab, queryDebounced, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    apiFetch('/products/groups')
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]));
  }, []);

  // ── Selection state for bulk actions ──────────────────────────────────────

  const productsWithId = useMemo(
    () => products.map((p) => ({ ...p, id: String(p.shopifyProductId) })),
    [products],
  );
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(productsWithId);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiFetch('/products/sync', { method: 'POST' });
      toast.success('Sincronizzazione avviata');
    } catch (e) {
      toast.error('Errore durante la sincronizzazione');
      console.error(e);
    }
    setTimeout(() => {
      setSyncing(false);
      loadData();
    }, 1500);
  };

  const handleConfirm = async (productId: number, mappingId: string) => {
    try {
      await apiFetch(`/products/${productId}/packaging/${mappingId}/confirm`, { method: 'PATCH' });
      toast.success('Suggerimento confermato');
    } catch (e) {
      toast.error('Errore durante la conferma');
      console.error(e);
      return;
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.shopifyProductId !== productId) return p;
        const comp = p.pendingComponents.find((c) => c.mappingId === mappingId);
        if (!comp) return p;
        const confirmed = [...p.confirmedComponents, { ...comp }];
        const pending = p.pendingComponents.filter((c) => c.mappingId !== mappingId);
        return { ...p, confirmedComponents: confirmed, pendingComponents: pending, status: 'mapped' };
      })
    );
  };

  const openDeleteModal = (productId: number, mappingId: string, name: string) => {
    setDeleteTarget({ productId, mappingId, name });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/products/${deleteTarget.productId}/packaging/${deleteTarget.mappingId}`, {
        method: 'DELETE',
      });
      toast.success('Associazione rimossa');
    } catch (e) {
      toast.error('Errore durante la rimozione');
      console.error(e);
      setDeleteLoading(false);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      return;
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.shopifyProductId !== deleteTarget.productId) return p;
        const confirmed = p.confirmedComponents.filter((c) => c.mappingId !== deleteTarget.mappingId);
        const pending = p.pendingComponents.filter((c) => c.mappingId !== deleteTarget.mappingId);
        const status: MappingStatus =
          confirmed.length > 0 ? 'mapped' : pending.length > 0 ? 'pending' : 'unmapped';
        return { ...p, confirmedComponents: confirmed, pendingComponents: pending, status };
      })
    );
    setDeleteLoading(false);
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const openAddModal = (product: MergedProduct) => {
    setAddTarget(product);
    setAddForm({
      packagingId: packagingOptions[0]?.id ?? '',
      purpose: 'CONTAINER',
      quantityPerUnit: '1',
      applyToGroups: [],
    });
    setAddModalOpen(true);
  };

  const openBulkGroupModal = () => {
    setBulkGroupForm({
      groupId: groups[0]?.id ?? '',
      packagingId: packagingOptions[0]?.id ?? '',
      purpose: 'CONTAINER',
      quantityPerUnit: '1',
      overwrite: false,
    });
    setBulkGroupModalOpen(true);
  };

  const openBulkSelectionModal = () => {
    setBulkSelectionForm({
      packagingId: packagingOptions[0]?.id ?? '',
      purpose: 'CONTAINER',
      quantityPerUnit: '1',
    });
    setBulkSelectionModalOpen(true);
  };

  const handleBulkGroupConfirm = async () => {
    if (!bulkGroupForm.groupId || !bulkGroupForm.packagingId) return;
    setBulkGroupLoading(true);
    try {
      await apiFetch(`/products/groups/${bulkGroupForm.groupId}/packaging`, {
        method: 'POST',
        body: JSON.stringify({
          packagingId: bulkGroupForm.packagingId,
          purpose: bulkGroupForm.purpose,
          quantityPerUnit: parseInt(bulkGroupForm.quantityPerUnit, 10),
          overwrite: bulkGroupForm.overwrite,
        }),
      });
      toast.success('Imballaggio applicato al gruppo');
      setBulkGroupModalOpen(false);
      loadData();
    } catch (e) {
      toast.error('Errore durante l\'applicazione al gruppo');
      console.error(e);
    } finally {
      setBulkGroupLoading(false);
    }
  };

  const handleBulkSelectionConfirm = async () => {
    if (!bulkSelectionForm.packagingId || selectedResources.length === 0) return;
    setBulkSelectionLoading(true);
    const payload = {
      packagingId: bulkSelectionForm.packagingId,
      purpose: bulkSelectionForm.purpose,
      quantityPerUnit: parseInt(bulkSelectionForm.quantityPerUnit, 10),
    };
    try {
      const results = await Promise.allSettled(
        selectedResources.map((id) =>
          apiFetch(`/products/${id}/packaging`, {
            method: 'POST',
            body: JSON.stringify(payload),
          }),
        ),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      const ok = results.length - failed;
      if (failed === 0) {
        toast.success(`Imballaggio applicato a ${ok} prodotti`);
      } else {
        toast.error(`${failed} su ${results.length} prodotti non aggiornati`);
      }
      setBulkSelectionModalOpen(false);
      clearSelection();
      loadData();
    } finally {
      setBulkSelectionLoading(false);
    }
  };

  const handleBulkConfirmSuggestions = async () => {
    const selectedSet = new Set(selectedResources);
    const pairs: { productId: number; mappingId: string }[] = [];
    products.forEach((p) => {
      if (!selectedSet.has(String(p.shopifyProductId))) return;
      p.pendingComponents.forEach((c) => {
        pairs.push({ productId: p.shopifyProductId, mappingId: c.mappingId });
      });
    });

    if (pairs.length === 0) {
      toast.error('I prodotti selezionati non hanno suggerimenti da confermare');
      return;
    }

    setBulkConfirming(true);
    const results = await Promise.allSettled(
      pairs.map(({ productId, mappingId }) =>
        apiFetch(`/products/${productId}/packaging/${mappingId}/confirm`, { method: 'PATCH' }),
      ),
    );
    setBulkConfirming(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    const ok = results.length - failed;
    if (failed === 0) {
      toast.success(`${ok} suggerimenti confermati`);
    } else {
      toast.error(`${failed} su ${results.length} suggerimenti non confermati`);
    }
    clearSelection();
    loadData();
  };

  const handleAddConfirm = async () => {
    if (!addTarget || !addForm.packagingId) return;
    setAddLoading(true);
    const payload = {
      packagingId: addForm.packagingId,
      purpose: addForm.purpose,
      quantityPerUnit: parseInt(addForm.quantityPerUnit, 10),
    };
    try {
      if (addForm.applyToGroups.length > 0) {
        await Promise.all(
          addForm.applyToGroups.map((groupId) =>
            apiFetch(`/products/groups/${groupId}/packaging`, {
              method: 'POST',
              body: JSON.stringify({ ...payload, overwrite: false }),
            })
          )
        );
        toast.success('Imballaggio applicato ai gruppi selezionati');
      } else {
        await apiFetch(`/products/${addTarget.shopifyProductId}/packaging`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Imballaggio associato al prodotto');
      }
      setAddModalOpen(false);
      loadData();
    } catch (e) {
      toast.error('Errore durante l\'associazione');
      console.error(e);
    } finally {
      setAddLoading(false);
    }
  };

  // ── Tab handling ──────────────────────────────────────────────────────────

  const handleTabChange = (tabIndex: number) => {
    setSelectedTab(tabIndex);
    setCurrentPage(1);
    clearSelection();
  };

  // ── Tab labels with server-side counts ────────────────────────────────────

  const totalAll = meta.totalMapped + meta.totalPending + meta.totalUnmapped;
  const tabs = [
    { id: 'all', content: `Tutti (${totalAll})` },
    { id: 'mapped', content: `Mappati (${meta.totalMapped})` },
    { id: 'pending', content: `Da Revisionare (${meta.totalPending})` },
    { id: 'unmapped', content: `Senza Imballaggio (${meta.totalUnmapped})` },
  ];

  const totalPages = Math.max(1, Math.ceil(meta.total / PAGE_LIMIT));

  // ── IndexTable rows ───────────────────────────────────────────────────────

  const rowMarkup = productsWithId.map((product, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      position={index}
      selected={selectedResources.includes(product.id)}
    >
      <IndexTable.Cell>
        <InlineStack gap="300" blockAlign="center">
          <Thumbnail source={product.imageUrl ?? ''} alt={product.title} size="small" />
          <Text as="span" fontWeight="bold">{product.title}</Text>
        </InlineStack>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <StatusCell status={product.status} />
      </IndexTable.Cell>

      <IndexTable.Cell>
        <BlockStack gap="200">
          {product.confirmedComponents.length > 0 && (
            <BlockStack gap="150">
              {product.confirmedComponents.map((comp) => (
                <InlineStack key={comp.mappingId} gap="200" blockAlign="center" wrap={false}>
                  <Thumbnail source={comp.packagingImageUrl || ''} alt={comp.packagingName} size="extraSmall" />
                  <BlockStack gap="050">
                    <Text as="span" fontWeight="semibold" variant="bodySm">{comp.packagingName} ×{comp.quantityPerUnit}</Text>
                    <Text as="span" variant="bodySm" tone="subdued">{purposeLabel(comp.purpose)}</Text>
                  </BlockStack>
                  <Button
                    icon={DeleteIcon}
                    size="micro"
                    tone="critical"
                    variant="plain"
                    accessibilityLabel="Rimuovi associazione"
                    onClick={() => openDeleteModal(product.shopifyProductId, comp.mappingId, comp.packagingName)}
                  />
                </InlineStack>
              ))}
            </BlockStack>
          )}

          {product.pendingComponents.length > 0 && (
            <BlockStack gap="200">
              {product.pendingComponents.map((comp) => (
                <Box
                  key={comp.mappingId}
                  background="bg-surface-secondary"
                  padding="300"
                  borderRadius="200"
                  borderWidth="025"
                  borderColor="border"
                >
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center" wrap={false}>
                      <Thumbnail source={comp.packagingImageUrl || ''} alt={comp.packagingName} size="extraSmall" />
                      <Text as="span" fontWeight="semibold">{comp.packagingName}</Text>
                      <Badge tone="info">{`${(comp.similarityScore * 100).toFixed(0)}%`}</Badge>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">{comp.reason}</Text>
                    <InlineStack gap="200">
                      <Button
                        size="micro"
                        variant="primary"
                        onClick={() => handleConfirm(product.shopifyProductId, comp.mappingId)}
                      >
                        Conferma
                      </Button>
                      <Button
                        size="micro"
                        tone="critical"
                        onClick={() => openDeleteModal(product.shopifyProductId, comp.mappingId, comp.packagingName)}
                      >
                        Rifiuta
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Box>
              ))}
            </BlockStack>
          )}

          {product.confirmedComponents.length === 0 && product.pendingComponents.length === 0 && (
            <Text as="span" tone="subdued" variant="bodySm">Nessun imballaggio assegnato</Text>
          )}
        </BlockStack>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Button
          icon={PlusIcon}
          size="micro"
          disabled={packagingOptions.length === 0}
          onClick={() => openAddModal(product)}
        >
          Aggiungi
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  // ── Bulk actions (visible only when something is selected) ────────────────

  const promotedBulkActions = [
    {
      content: 'Assegna imballaggio',
      icon: PlusIcon,
      onAction: openBulkSelectionModal,
      disabled: packagingOptions.length === 0,
    },
    {
      content: 'Conferma suggerimenti AI',
      icon: CheckIcon,
      onAction: handleBulkConfirmSuggestions,
      disabled: bulkConfirming,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Page
      title="Mappatura Prodotti"
      primaryAction={{
        content: 'Sincronizza Shopify',
        onAction: handleSync,
        loading: syncing,
      }}
      secondaryActions={[
        {
          content: 'Associa a gruppo',
          onAction: openBulkGroupModal,
          disabled: groups.length === 0 || packagingOptions.length === 0,
        },
      ]}
    >
      <Layout>
        {!loading && packagingOptions.length === 0 && (
          <Layout.Section>
            <Banner
              tone="warning"
              title="Configura prima l'inventario imballaggi"
              action={{ content: 'Vai a Inventario', onAction: () => navigate('/inventory') }}
            >
              <p>
                Per associare gli imballaggi ai prodotti devi prima aver censito almeno
                un imballaggio nell'inventario.
              </p>
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <Card padding="0">
            <IndexFilters
              tabs={tabs}
              selected={selectedTab}
              onSelect={handleTabChange}
              queryValue={queryValue}
              queryPlaceholder="Cerca prodotto…"
              onQueryChange={setQueryValue}
              onQueryClear={() => setQueryValue('')}
              mode={mode}
              setMode={setMode}
              filters={[]}
              appliedFilters={[]}
              onClearAll={() => setQueryValue('')}
              cancelAction={{
                onAction: () => setQueryValue(''),
                disabled: false,
                loading: false,
              }}
              hideFilters
              canCreateNewView={false}
            />

            {loading ? (
              <Box padding="400">
                <SkeletonBodyText lines={6} />
              </Box>
            ) : products.length === 0 ? (
              <EmptyState
                heading={
                  selectedTab === 3
                    ? 'Tutti i prodotti sono mappati!'
                    : queryDebounced
                      ? 'Nessun risultato trovato'
                      : 'Nessun prodotto trovato'
                }
                action={
                  !queryDebounced
                    ? { content: 'Sincronizza Shopify', onAction: handleSync, loading: syncing }
                    : undefined
                }
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p">
                  {selectedTab === 3
                    ? 'Ottimo! Ogni prodotto ha almeno un imballaggio associato.'
                    : queryDebounced
                      ? `Nessun prodotto corrisponde a "${queryDebounced}".`
                      : 'Sincronizza i tuoi prodotti da Shopify per iniziare la mappatura.'}
                </Text>
              </EmptyState>
            ) : (
              <BlockStack>
                <IndexTable
                  resourceName={{ singular: 'prodotto', plural: 'prodotti' }}
                  itemCount={productsWithId.length}
                  selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                  onSelectionChange={handleSelectionChange}
                  promotedBulkActions={promotedBulkActions}
                  headings={[
                    { title: 'Prodotto' },
                    { title: 'Stato' },
                    { title: 'Imballaggio' },
                    { title: 'Azione' },
                  ]}
                >
                  {rowMarkup}
                </IndexTable>
                {totalPages > 1 && (
                  <Box padding="400" paddingBlockStart="200">
                    <InlineStack align="center" gap="300" blockAlign="center">
                      <Pagination
                        hasPrevious={currentPage > 1}
                        hasNext={currentPage < totalPages}
                        onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      />
                      <Text as="span" variant="bodySm" tone="subdued">
                        Pagina {currentPage} di {totalPages} · {meta.total} prodotti
                      </Text>
                    </InlineStack>
                  </Box>
                )}
              </BlockStack>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      {/* ── Bulk Packaging by Group Modal ───────────────────────────────────── */}
      <Modal
        open={bulkGroupModalOpen}
        onClose={() => setBulkGroupModalOpen(false)}
        title="Associa imballaggio a un gruppo"
        primaryAction={{
          content: 'Applica al gruppo',
          onAction: handleBulkGroupConfirm,
          loading: bulkGroupLoading,
          disabled: !bulkGroupForm.groupId || !bulkGroupForm.packagingId,
        }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setBulkGroupModalOpen(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <PolarisSelect
              label="Gruppo prodotto"
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
              value={bulkGroupForm.groupId}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, groupId: v }))}
            />
            <PolarisSelect
              label="Imballaggio"
              options={packagingOptions.map((p) => ({ label: p.name, value: p.id }))}
              value={bulkGroupForm.packagingId}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, packagingId: v }))}
            />
            <PolarisSelect
              label="Scopo"
              options={PURPOSE_OPTIONS}
              value={bulkGroupForm.purpose}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, purpose: v }))}
            />
            <TextField
              label="Quantità per unità"
              type="number"
              value={bulkGroupForm.quantityPerUnit}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, quantityPerUnit: v }))}
              autoComplete="off"
              min={1}
            />
            <Checkbox
              label="Sovrascrivi associazioni esistenti con lo stesso scopo"
              checked={bulkGroupForm.overwrite}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, overwrite: v }))}
              helpText="Se attivo, rimuove le associazioni esistenti dello stesso scopo prima di applicare quella nuova."
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* ── Bulk Packaging by Selection Modal (from IndexTable bulk action) ── */}
      <Modal
        open={bulkSelectionModalOpen}
        onClose={() => setBulkSelectionModalOpen(false)}
        title={`Associa imballaggio a ${selectedResources.length} prodotti selezionati`}
        primaryAction={{
          content: 'Applica',
          onAction: handleBulkSelectionConfirm,
          loading: bulkSelectionLoading,
          disabled: !bulkSelectionForm.packagingId,
        }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setBulkSelectionModalOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Banner tone="info">
              <p>
                Questo imballaggio verrà aggiunto a <b>{selectedResources.length}</b> prodotti.
                Le associazioni esistenti non verranno modificate.
              </p>
            </Banner>
            <FormLayout>
              <PolarisSelect
                label="Imballaggio"
                options={packagingOptions.map((p) => ({ label: p.name, value: p.id }))}
                value={bulkSelectionForm.packagingId}
                onChange={(v) => setBulkSelectionForm((f) => ({ ...f, packagingId: v }))}
              />
              <PolarisSelect
                label="Scopo"
                options={PURPOSE_OPTIONS}
                value={bulkSelectionForm.purpose}
                onChange={(v) => setBulkSelectionForm((f) => ({ ...f, purpose: v }))}
              />
              <TextField
                label="Quantità per unità"
                type="number"
                value={bulkSelectionForm.quantityPerUnit}
                onChange={(v) => setBulkSelectionForm((f) => ({ ...f, quantityPerUnit: v }))}
                autoComplete="off"
                min={1}
              />
            </FormLayout>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ── Add Packaging Modal (single product) ─────────────────────────────── */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={`Associa imballaggio — ${addTarget?.title ?? ''}`}
        primaryAction={{
          content: 'Salva',
          onAction: handleAddConfirm,
          loading: addLoading,
          disabled: !addForm.packagingId,
        }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setAddModalOpen(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <PolarisSelect
              label="Imballaggio"
              options={packagingOptions.map((p) => ({ label: p.name, value: p.id }))}
              value={addForm.packagingId}
              onChange={(v) => setAddForm((f) => ({ ...f, packagingId: v }))}
            />
            <PolarisSelect
              label="Scopo"
              options={PURPOSE_OPTIONS}
              value={addForm.purpose}
              onChange={(v) => setAddForm((f) => ({ ...f, purpose: v }))}
            />
            <TextField
              label="Quantità per unità"
              type="number"
              value={addForm.quantityPerUnit}
              onChange={(v) => setAddForm((f) => ({ ...f, quantityPerUnit: v }))}
              autoComplete="off"
              min={1}
            />
            {addTarget?.groups && addTarget.groups.length > 0 && (
              <BlockStack gap="200">
                <Text as="span" variant="bodySm" tone="subdued">
                  Questo prodotto appartiene {addTarget.groups.length === 1 ? 'a un gruppo' : 'a più gruppi'}.
                  Puoi applicare l'imballaggio anche agli altri prodotti del gruppo:
                </Text>
                {addTarget.groups.map((g) => (
                  <Checkbox
                    key={g.id}
                    label={`Applica a tutti i prodotti del gruppo "${g.name}"`}
                    checked={addForm.applyToGroups.includes(g.id)}
                    onChange={(checked) =>
                      setAddForm((f) => ({
                        ...f,
                        applyToGroups: checked
                          ? [...f.applyToGroups, g.id]
                          : f.applyToGroups.filter((id) => id !== g.id),
                      }))
                    }
                  />
                ))}
              </BlockStack>
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* ── Delete / Reject Confirm Modal ───────────────────────────────────── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Conferma rimozione"
        primaryAction={{
          content: 'Rimuovi',
          onAction: handleDeleteConfirm,
          loading: deleteLoading,
          destructive: true,
        }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setDeleteModalOpen(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            Vuoi rimuovere l'associazione con <Text as="span" fontWeight="bold">{deleteTarget?.name}</Text>?
            Questa azione non può essere annullata.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
