import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Button,
  Text,
  InlineStack,
  BlockStack,
  Box,
  Icon,
  EmptyState,
  Modal,
  FormLayout,
  TextField,
  Tabs,
  Thumbnail,
  SkeletonBodyText,
  Pagination,
} from '@shopify/polaris';
import { CheckIcon, AlertCircleIcon, MagicIcon, DeleteIcon, PlusIcon, SearchIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';
import { PolarisSelect } from '../components/PolarisSelect';
import { getMaterialImage } from '../components/PackagingCard';

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
}

interface MergedViewMeta {
  total: number;
  page: number;
  limit: number;
  totalMapped: number;
  totalPending: number;
  totalUnmapped: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusCell({ status }: { status: MappingStatus }) {
  if (status === 'mapped') {
    return <Badge tone="success">Mappato</Badge>;
  }
  if (status === 'pending') {
    return <Badge tone="info">Suggerimento AI</Badge>;
  }
  return <Badge tone="critical">Non Mappato</Badge>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Mapping() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Add packaging modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<MergedProduct | null>(null);
  const [addForm, setAddForm] = useState({ packagingId: '', purpose: 'CONTAINER', quantityPerUnit: '1' });
  const [addLoading, setAddLoading] = useState(false);

  // Delete/reject confirm modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ productId: number; mappingId: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Debounce search ───────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = STATUS_FILTER_MAP[selectedTab];
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_LIMIT));
      if (statusParam) params.set('status', statusParam);
      if (searchDebounced.trim()) params.set('search', searchDebounced.trim());

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
      }

      if (inventoryResult.status === 'fulfilled') {
        setPackagingOptions(inventoryResult.value ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedTab, searchDebounced]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiFetch('/products/sync', { method: 'POST' });
    } catch {
      // ignore
    }
    setTimeout(() => {
      setSyncing(false);
      loadData();
    }, 1500);
  };

  const handleConfirm = async (productId: number, mappingId: string) => {
    try {
      await apiFetch(`/products/${productId}/packaging/${mappingId}/confirm`, { method: 'PATCH' });
    } catch {
      // optimistic update continues below
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
    } catch {
      // optimistic update continues below
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
    setAddForm({ packagingId: packagingOptions[0]?.id ?? '', purpose: 'CONTAINER', quantityPerUnit: '1' });
    setAddModalOpen(true);
  };

  const handleAddConfirm = async () => {
    if (!addTarget || !addForm.packagingId) return;
    setAddLoading(true);
    try {
      await apiFetch(`/products/${addTarget.shopifyProductId}/packaging`, {
        method: 'POST',
        body: JSON.stringify({
          packagingId: addForm.packagingId,
          purpose: addForm.purpose,
          quantityPerUnit: parseInt(addForm.quantityPerUnit, 10),
        }),
      });
      setAddModalOpen(false);
      loadData();
    } catch {
      // ignore for demo
    } finally {
      setAddLoading(false);
    }
  };

  // ── Tab handling ──────────────────────────────────────────────────────────

  const handleTabChange = (tabIndex: number) => {
    setSelectedTab(tabIndex);
    setCurrentPage(1); // Reset to page 1 on tab change
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

  // ── Table rows ─────────────────────────────────────────────────────────────

  const rows = products.map((product) => {
    const productCell = (
      <InlineStack gap="300" blockAlign="center">
        <Thumbnail
          source={product.imageUrl ?? ''}
          alt={product.title}
          size="small"
        />
        <Text as="span" fontWeight="bold">{product.title}</Text>
      </InlineStack>
    );

    const packagingCell = (
      <BlockStack gap="200">
        {product.confirmedComponents.length > 0 && (
          <BlockStack gap="150">
            {product.confirmedComponents.map((comp) => (
              <InlineStack key={comp.mappingId} gap="200" blockAlign="center" wrap={false}>
                <Thumbnail
                  source={getMaterialImage(comp.packagingMaterial)}
                  alt={comp.packagingName}
                  size="extraSmall"
                />
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
                    <Thumbnail
                      source={getMaterialImage(comp.packagingMaterial)}
                      alt={comp.packagingName}
                      size="extraSmall"
                    />
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
    );

    const actionsCell = (
      <Button icon={PlusIcon} size="micro" onClick={() => openAddModal(product)}>
        Aggiungi
      </Button>
    );

    return [productCell, <StatusCell status={product.status} />, packagingCell, actionsCell];
  });

  // ── Render ─────────────────────────────────────────────────────────────────

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
            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange} fitted>
              {/* Search bar */}
              <Box padding="300" paddingBlockEnd="0">
                <TextField
                  label=""
                  labelHidden
                  placeholder="Cerca prodotto..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  prefix={<Icon source={SearchIcon} />}
                  clearButton
                  onClearButtonClick={() => setSearchQuery('')}
                  autoComplete="off"
                />
              </Box>

              {loading ? (
                <Box padding="400">
                  <SkeletonBodyText lines={6} />
                </Box>
              ) : products.length === 0 ? (
                <EmptyState
                  heading={
                    selectedTab === 3
                      ? 'Tutti i prodotti sono mappati!'
                      : searchDebounced
                        ? 'Nessun risultato trovato'
                        : 'Nessun prodotto trovato'
                  }
                  action={
                    !searchDebounced
                      ? { content: 'Sincronizza Shopify', onAction: handleSync, loading: syncing }
                      : undefined
                  }
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <Text as="p">
                    {selectedTab === 3
                      ? 'Ottimo! Ogni prodotto ha almeno un imballaggio associato.'
                      : searchDebounced
                        ? `Nessun prodotto corrisponde a "${searchDebounced}".`
                        : 'Sincronizza i tuoi prodotti da Shopify per iniziare la mappatura.'}
                  </Text>
                </EmptyState>
              ) : (
                <BlockStack>
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text']}
                    headings={['Prodotto', 'Stato', 'Imballaggio', 'Azione']}
                    rows={rows}
                    verticalAlign="middle"
                  />
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
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* ── Add Packaging Modal ─────────────────────────────────────────────── */}
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
