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
import { useTranslation, Trans } from 'react-i18next';
import { apiFetch } from '../utils/api';
import { useToast } from '../utils/toast';
import { PolarisSelect } from '../components/PolarisSelect';
import { AISuggestion } from '../components/AISuggestion';

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

const PURPOSE_VALUES: PackagingComponent['purpose'][] = ['CONTAINER', 'WRAP', 'SEAL', 'LABEL', 'CUSHION'];

const STATUS_FILTER_MAP: Record<number, MappingStatus | undefined> = {
  0: undefined,    // "All"
  1: 'mapped',     // "Matched"
  2: 'pending',    // "To review"
  3: 'unmapped',   // "No packaging"
};

const PAGE_LIMIT = 25;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Mapping() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation('product_mapping');
  const { t: tCommon } = useTranslation('common');

  const purposeLabel = useCallback(
    (purpose: string) => t(`mapping.purposes.${purpose}` as 'mapping.purposes.CONTAINER'),
    [t],
  );

  const purposeOptions = useMemo(
    () => PURPOSE_VALUES.map((p) => ({ value: p, label: purposeLabel(p) })),
    [purposeLabel],
  );

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
        toast.error(t('mapping.toasts.load_failed'));
      }

      if (inventoryResult.status === 'fulfilled') {
        setPackagingOptions(inventoryResult.value ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedTab, queryDebounced, toast, t]);

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
      toast.success(t('mapping.toasts.sync_started'));
    } catch (e) {
      toast.error(t('mapping.toasts.sync_failed'));
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
      toast.success(t('mapping.toasts.ai_confirmed'));
    } catch (e) {
      toast.error(t('mapping.toasts.ai_confirm_failed'));
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
      toast.success(t('mapping.toasts.mapping_removed'));
    } catch (e) {
      toast.error(t('mapping.toasts.mapping_remove_failed'));
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
      toast.success(t('mapping.toasts.bulk_group_applied'));
      setBulkGroupModalOpen(false);
      loadData();
    } catch (e) {
      toast.error(t('mapping.toasts.bulk_group_failed'));
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
        toast.success(t('mapping.toasts.bulk_selection_applied', { count: ok }));
      } else {
        toast.error(t('mapping.toasts.bulk_selection_partial', { failed, total: results.length }));
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
      toast.error(t('mapping.toasts.bulk_confirm_no_pending'));
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
      toast.success(t('mapping.toasts.bulk_confirm_all_done', { count: ok }));
    } else {
      toast.error(t('mapping.toasts.bulk_confirm_partial', { failed, total: results.length }));
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
        toast.success(t('mapping.toasts.mapping_add_to_groups'));
      } else {
        await apiFetch(`/products/${addTarget.shopifyProductId}/packaging`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success(t('mapping.toasts.mapping_added'));
      }
      setAddModalOpen(false);
      loadData();
    } catch (e) {
      toast.error(t('mapping.toasts.mapping_add_failed'));
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

  // ── Status badge ──────────────────────────────────────────────────────────

  const StatusCell = ({ status }: { status: MappingStatus }) => {
    if (status === 'mapped') return <Badge tone="success">{t('mapping.status.mapped')}</Badge>;
    if (status === 'pending') return <Badge tone="info">{t('mapping.status.pending')}</Badge>;
    return <Badge tone="critical">{t('mapping.status.unmapped')}</Badge>;
  };

  // ── Tab labels with server-side counts ────────────────────────────────────

  const totalAll = meta.totalMapped + meta.totalPending + meta.totalUnmapped;
  const tabs = [
    { id: 'all', content: t('mapping.tabs.all', { count: totalAll }) },
    { id: 'mapped', content: t('mapping.tabs.mapped', { count: meta.totalMapped }) },
    { id: 'pending', content: t('mapping.tabs.pending', { count: meta.totalPending }) },
    { id: 'unmapped', content: t('mapping.tabs.unmapped', { count: meta.totalUnmapped }) },
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
                    <Text as="span" fontWeight="semibold" variant="bodySm">
                      {comp.packagingName} {t('mapping.table.row.quantity_suffix', { count: comp.quantityPerUnit })}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">{purposeLabel(comp.purpose)}</Text>
                  </BlockStack>
                  <Button
                    icon={DeleteIcon}
                    size="micro"
                    tone="critical"
                    variant="plain"
                    accessibilityLabel={t('mapping.table.row.remove_accessibility')}
                    onClick={() => openDeleteModal(product.shopifyProductId, comp.mappingId, comp.packagingName)}
                  />
                </InlineStack>
              ))}
            </BlockStack>
          )}

          {product.pendingComponents.length > 0 && (
            <BlockStack gap="200">
              {product.pendingComponents.map((comp) => (
                <AISuggestion.Item
                  key={comp.mappingId}
                  thumbnailUrl={comp.packagingImageUrl}
                  title={comp.packagingName}
                  confidence={comp.similarityScore}
                  reason={comp.reason}
                  acceptLabel={t('mapping.table.row.ai_accept')}
                  rejectLabel={t('mapping.table.row.ai_reject')}
                  onAccept={() => handleConfirm(product.shopifyProductId, comp.mappingId)}
                  onReject={() => openDeleteModal(product.shopifyProductId, comp.mappingId, comp.packagingName)}
                />
              ))}
            </BlockStack>
          )}

          {product.confirmedComponents.length === 0 && product.pendingComponents.length === 0 && (
            <Text as="span" tone="subdued" variant="bodySm">{t('mapping.table.row.no_packaging')}</Text>
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
          {t('mapping.table.row.add_cta')}
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  // ── Bulk actions (visible only when something is selected) ────────────────

  const promotedBulkActions = [
    {
      content: t('mapping.bulk_actions.assign_packaging'),
      icon: PlusIcon,
      onAction: openBulkSelectionModal,
      disabled: packagingOptions.length === 0,
    },
    {
      content: t('mapping.bulk_actions.confirm_ai_suggestions'),
      icon: CheckIcon,
      onAction: handleBulkConfirmSuggestions,
      disabled: bulkConfirming,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Page
      title={t('mapping.page.title')}
      subtitle={t('mapping.page.subtitle')}
      primaryAction={{
        content: t('mapping.page.primary_action'),
        onAction: handleSync,
        loading: syncing,
      }}
      secondaryActions={[
        {
          content: t('mapping.page.secondary_action_assign_group'),
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
              title={t('mapping.no_inventory_banner.title')}
              action={{ content: t('mapping.no_inventory_banner.cta'), onAction: () => navigate('/inventory') }}
            >
              <p>{t('mapping.no_inventory_banner.body')}</p>
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
              queryPlaceholder={t('mapping.search_placeholder')}
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
                    ? t('mapping.empty_state.all_mapped_heading')
                    : queryDebounced
                      ? t('mapping.empty_state.no_search_results_heading')
                      : t('mapping.empty_state.no_products_heading')
                }
                action={
                  !queryDebounced
                    ? { content: t('mapping.page.primary_action'), onAction: handleSync, loading: syncing }
                    : undefined
                }
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p">
                  {selectedTab === 3
                    ? t('mapping.empty_state.all_mapped_body')
                    : queryDebounced
                      ? t('mapping.empty_state.no_search_results_body', { query: queryDebounced })
                      : t('mapping.empty_state.no_products_body')}
                </Text>
              </EmptyState>
            ) : (
              <BlockStack>
                <IndexTable
                  resourceName={{ singular: t('mapping.table.resource_singular'), plural: t('mapping.table.resource_plural') }}
                  itemCount={productsWithId.length}
                  selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                  onSelectionChange={handleSelectionChange}
                  promotedBulkActions={promotedBulkActions}
                  headings={[
                    { title: t('mapping.table.columns.product') },
                    { title: t('mapping.table.columns.status') },
                    { title: t('mapping.table.columns.packaging') },
                    { title: t('mapping.table.columns.action') },
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
                        {t('mapping.table.pagination', { current: currentPage, total: totalPages, count: meta.total })}
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
        title={t('mapping.modal.bulk_group.title')}
        primaryAction={{
          content: t('mapping.modal.bulk_group.primary'),
          onAction: handleBulkGroupConfirm,
          loading: bulkGroupLoading,
          disabled: !bulkGroupForm.groupId || !bulkGroupForm.packagingId,
        }}
        secondaryActions={[{ content: tCommon('actions.cancel'), onAction: () => setBulkGroupModalOpen(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <PolarisSelect
              label={t('mapping.modal.bulk_group.form.group_label')}
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
              value={bulkGroupForm.groupId}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, groupId: v }))}
            />
            <PolarisSelect
              label={t('mapping.modal.bulk_group.form.packaging_label')}
              options={packagingOptions.map((p) => ({ label: p.name, value: p.id }))}
              value={bulkGroupForm.packagingId}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, packagingId: v }))}
            />
            <PolarisSelect
              label={t('mapping.modal.bulk_group.form.purpose_label')}
              options={purposeOptions}
              value={bulkGroupForm.purpose}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, purpose: v }))}
            />
            <TextField
              label={t('mapping.modal.bulk_group.form.quantity_label')}
              type="number"
              value={bulkGroupForm.quantityPerUnit}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, quantityPerUnit: v }))}
              autoComplete="off"
              min={1}
            />
            <Checkbox
              label={t('mapping.modal.bulk_group.form.overwrite_label')}
              checked={bulkGroupForm.overwrite}
              onChange={(v) => setBulkGroupForm((f) => ({ ...f, overwrite: v }))}
              helpText={t('mapping.modal.bulk_group.form.overwrite_help')}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* ── Bulk Packaging by Selection Modal (from IndexTable bulk action) ── */}
      <Modal
        open={bulkSelectionModalOpen}
        onClose={() => setBulkSelectionModalOpen(false)}
        title={t('mapping.modal.bulk_selection.title', { count: selectedResources.length })}
        primaryAction={{
          content: t('mapping.modal.bulk_selection.primary'),
          onAction: handleBulkSelectionConfirm,
          loading: bulkSelectionLoading,
          disabled: !bulkSelectionForm.packagingId,
        }}
        secondaryActions={[{ content: tCommon('actions.cancel'), onAction: () => setBulkSelectionModalOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Banner tone="info">
              <p>
                <Trans
                  ns="product_mapping"
                  i18nKey="mapping.modal.bulk_selection.info_banner"
                  values={{ count: selectedResources.length }}
                  components={{ strong: <strong /> }}
                />
              </p>
            </Banner>
            <FormLayout>
              <PolarisSelect
                label={t('mapping.modal.bulk_selection.form.packaging_label')}
                options={packagingOptions.map((p) => ({ label: p.name, value: p.id }))}
                value={bulkSelectionForm.packagingId}
                onChange={(v) => setBulkSelectionForm((f) => ({ ...f, packagingId: v }))}
              />
              <PolarisSelect
                label={t('mapping.modal.bulk_selection.form.purpose_label')}
                options={purposeOptions}
                value={bulkSelectionForm.purpose}
                onChange={(v) => setBulkSelectionForm((f) => ({ ...f, purpose: v }))}
              />
              <TextField
                label={t('mapping.modal.bulk_selection.form.quantity_label')}
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
        title={t('mapping.modal.single.title', { product: addTarget?.title ?? '' })}
        primaryAction={{
          content: t('mapping.modal.single.primary'),
          onAction: handleAddConfirm,
          loading: addLoading,
          disabled: !addForm.packagingId,
        }}
        secondaryActions={[{ content: tCommon('actions.cancel'), onAction: () => setAddModalOpen(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <PolarisSelect
              label={t('mapping.modal.single.form.packaging_label')}
              options={packagingOptions.map((p) => ({ label: p.name, value: p.id }))}
              value={addForm.packagingId}
              onChange={(v) => setAddForm((f) => ({ ...f, packagingId: v }))}
            />
            <PolarisSelect
              label={t('mapping.modal.single.form.purpose_label')}
              options={purposeOptions}
              value={addForm.purpose}
              onChange={(v) => setAddForm((f) => ({ ...f, purpose: v }))}
            />
            <TextField
              label={t('mapping.modal.single.form.quantity_label')}
              type="number"
              value={addForm.quantityPerUnit}
              onChange={(v) => setAddForm((f) => ({ ...f, quantityPerUnit: v }))}
              autoComplete="off"
              min={1}
              helpText={t('mapping.modal.single.form.quantity_help')}
            />
            {addTarget?.groups && addTarget.groups.length > 0 && (
              <BlockStack gap="200">
                <Text as="span" variant="bodySm" tone="subdued">
                  {addTarget.groups.length === 1
                    ? t('mapping.modal.single.form.apply_to_groups_hint_single')
                    : t('mapping.modal.single.form.apply_to_groups_hint_multi')}
                </Text>
                {addTarget.groups.map((g) => (
                  <Checkbox
                    key={g.id}
                    label={t('mapping.modal.single.form.apply_to_group_checkbox', { group: g.name })}
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
        title={t('mapping.modal.delete.title')}
        primaryAction={{
          content: t('mapping.modal.delete.primary'),
          onAction: handleDeleteConfirm,
          loading: deleteLoading,
          destructive: true,
        }}
        secondaryActions={[{ content: tCommon('actions.cancel'), onAction: () => setDeleteModalOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text as="p">
              <Trans
                ns="product_mapping"
                i18nKey="mapping.modal.delete.body"
                values={{ name: deleteTarget?.name ?? '' }}
                components={{ strong: <strong /> }}
              />
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              {t('mapping.modal.delete.irreversible_note')}
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
