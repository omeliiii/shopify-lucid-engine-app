import { useState, useEffect, useCallback } from 'react';
import {
  Page, Layout, Card, Text, Button, Modal, Form, FormLayout,
  TextField, InlineStack, BlockStack, Badge, Box, Tabs, Banner,
  Tag, OptionList, Scrollable, EmptyState,
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';
import { useTranslation, Trans } from 'react-i18next';
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

export default function Groups() {
  const toast = useToast();
  const { t } = useTranslation('product_mapping');
  const { t: tCommon } = useTranslation('common');

  const matchTypeLabel = useCallback(
    (mt: 'MANUAL' | 'PRODUCT_TYPE' | 'TAG') =>
      t(`groups.match_types.${mt}` as 'groups.match_types.MANUAL'),
    [t],
  );

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
      toast.error(t('groups.toasts.load_failed'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

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
      toast.error(t('groups.toasts.name_required'));
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
        toast.success(t('groups.toasts.updated'));
      } else {
        await apiFetch('/products/groups', { method: 'POST', body: JSON.stringify(body) });
        toast.success(t('groups.toasts.created'));
      }
      setGroupModalOpen(false);
      resetForm();
      await loadGroups();
    } catch (e) {
      toast.error(editingGroupId ? t('groups.toasts.update_failed') : t('groups.toasts.create_failed'));
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
      toast.success(t('groups.toasts.deleted'));
      await loadGroups();
    } catch (e) {
      toast.error(t('groups.toasts.delete_failed'));
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
      toast.success(t('groups.toasts.sync_done'));
      await loadGroups();
    } catch (e) {
      toast.error(t('groups.toasts.sync_failed'));
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
    { id: 'all', content: t('groups.tabs.all', { count: groups.length }) },
    { id: 'product-type', content: t('groups.tabs.product_type', { count: groups.filter((g) => g.matchType === 'PRODUCT_TYPE').length }) },
    { id: 'tag', content: t('groups.tabs.tag', { count: groups.filter((g) => g.matchType === 'TAG').length }) },
    { id: 'manual', content: t('groups.tabs.manual', { count: groups.filter((g) => g.matchType === 'MANUAL').length }) },
  ];

  return (
    <Page
      title={t('groups.page.title')}
      subtitle={t('groups.page.subtitle')}
      primaryAction={{
        content: t('groups.page.primary_action'),
        onAction: () => { resetForm(); setGroupModalOpen(true); },
      }}
      secondaryActions={[
        {
          content: t('groups.page.secondary_action_sync'),
          onAction: handleSyncFromCatalog,
          loading: syncingCatalog,
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            <p>
              <Trans
                ns="product_mapping"
                i18nKey="groups.info_banner"
                components={{ strong: <strong />, code: <code /> }}
              />
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box padding="400">
                {visibleGroups.length === 0 && !loading ? (
                  <EmptyState
                    heading={selectedTab === 0 ? t('groups.empty_state.heading_all') : t('groups.empty_state.heading_category')}
                    action={
                      selectedTab === 0
                        ? { content: t('groups.empty_state.cta'), onAction: () => { resetForm(); setGroupModalOpen(true); } }
                        : undefined
                    }
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>{t('groups.empty_state.body')}</p>
                  </EmptyState>
                ) : (
                  <BlockStack gap="400">
                    {visibleGroups.map((group) => {
                      const rulesUsingGroup = rules.filter((r) => r.productGroupId === group.id);
                      const manualCount = group.members?.length ?? 0;
                      return (
                        <Card key={group.id} padding="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="200">
                              <InlineStack gap="200" blockAlign="center">
                                <Text as="h3" variant="headingMd">{group.name}</Text>
                                <Badge tone="info">{matchTypeLabel(group.matchType)}</Badge>
                              </InlineStack>
                              {group.matchValue && (
                                <Text as="p" tone="subdued">
                                  {t('groups.card.match_value_label')}: <b>{group.matchValue}</b>
                                </Text>
                              )}
                              {group.matchType === 'MANUAL' && group.members && (
                                <Text as="p" tone="subdued">
                                  {manualCount === 1
                                    ? t('groups.card.manual_count_one')
                                    : t('groups.card.manual_count', { count: manualCount })}
                                </Text>
                              )}
                              {rulesUsingGroup.length > 0 ? (
                                <InlineStack gap="200">
                                  <Text as="span" variant="bodySm" tone="subdued">{t('groups.card.used_in')}</Text>
                                  {rulesUsingGroup.map((r) => (
                                    <Tag key={r.id}>{r.name}</Tag>
                                  ))}
                                </InlineStack>
                              ) : (
                                <Text as="p" variant="bodySm" tone="caution">
                                  {t('groups.card.no_rules')}
                                </Text>
                              )}
                            </BlockStack>
                            <InlineStack gap="200">
                              <Button icon={EditIcon} onClick={() => handleEdit(group)}>{tCommon('actions.edit')}</Button>
                              <Button tone="critical" icon={DeleteIcon} onClick={() => askDelete(group)}>{tCommon('actions.delete')}</Button>
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
        title={editingGroupId ? t('groups.modal.title_edit') : t('groups.modal.title_new')}
        primaryAction={{ content: t('groups.modal.primary'), onAction: handleSubmit, loading: saving }}
        secondaryActions={[{ content: tCommon('actions.cancel'), onAction: () => { setGroupModalOpen(false); resetForm(); } }]}
      >
        <Modal.Section>
          <Form onSubmit={handleSubmit}>
            <FormLayout>
              <TextField
                label={t('groups.modal.form.name_label')}
                value={groupName}
                onChange={setGroupName}
                autoComplete="off"
                placeholder={t('groups.modal.form.name_placeholder')}
              />
              <PolarisSelect
                label={t('groups.modal.form.match_type_label')}
                options={[
                  { label: t('groups.match_types.PRODUCT_TYPE_option'), value: 'PRODUCT_TYPE' },
                  { label: t('groups.match_types.TAG_option'), value: 'TAG' },
                  { label: t('groups.match_types.MANUAL_option'), value: 'MANUAL' },
                ]}
                value={matchType}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(v) => setMatchType(v as any)}
              />
              {matchType !== 'MANUAL' ? (
                <TextField
                  label={
                    matchType === 'PRODUCT_TYPE'
                      ? t('groups.modal.form.match_value_label_product_type')
                      : t('groups.modal.form.match_value_label_tag')
                  }
                  value={matchValue}
                  onChange={setMatchValue}
                  autoComplete="off"
                  helpText={
                    matchType === 'PRODUCT_TYPE'
                      ? t('groups.modal.form.match_value_help_product_type')
                      : t('groups.modal.form.match_value_help_tag')
                  }
                />
              ) : (
                <Box paddingBlockStart="200">
                  <Text as="h3" variant="headingSm">{t('groups.modal.form.manual_section_title')}</Text>
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
        title={t('groups.delete_modal.title')}
        primaryAction={{
          content: t('groups.delete_modal.primary'),
          destructive: true,
          loading: deleting,
          onAction: handleConfirmDelete,
        }}
        secondaryActions={[
          { content: tCommon('actions.cancel'), onAction: () => { setDeleteModalOpen(false); setPendingDelete(null); } },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text as="p">
              <Trans
                ns="product_mapping"
                i18nKey="groups.delete_modal.body"
                values={{ name: pendingDelete?.name ?? '' }}
                components={{ strong: <strong /> }}
              />
            </Text>
            {pendingDelete && pendingDelete.rulesInGroup > 0 && (
              <Banner tone="warning">
                <p>
                  <Trans
                    ns="product_mapping"
                    i18nKey={pendingDelete.rulesInGroup === 1 ? 'groups.delete_modal.rules_warning_one' : 'groups.delete_modal.rules_warning'}
                    values={{ count: pendingDelete.rulesInGroup }}
                    components={{ strong: <strong /> }}
                  />
                </p>
              </Banner>
            )}
            <Text as="p" tone="subdued" variant="bodySm">
              {t('groups.delete_modal.irreversible_note')}
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
