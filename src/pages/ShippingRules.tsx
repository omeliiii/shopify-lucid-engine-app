import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page, Layout, Card, Text, Button, Modal, Form, FormLayout,
  TextField, Checkbox, InlineStack, BlockStack, Badge, Banner,
  Thumbnail, RangeSlider,
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { apiFetch } from '../utils/api';
import { useToast } from '../utils/toast';
import { FALLBACK_PACKAGING_IMAGE_URL } from '../utils/packagingImage';
import { PolarisSelect } from '../components/PolarisSelect';

// ── Types ──

interface ProductGroupRef {
  id: string;
  name: string;
}

interface ShippingRule {
  id: string;
  name: string;
  minItems: number;
  maxItems: number;
  secondaryPackagingId: string | null;
  secondaryStaticWeightGOverride: number | null;
  fillerPackagingId: string | null;
  fillerStaticWeightGOverride: number | null;
  tapePackagingId: string | null;
  tapeStaticWeightGOverride: number | null;
  productGroupId: string | null;
  priority: number;
  isActive: boolean;
  secondaryPackaging?: { id: string; name: string };
  fillerPackaging?: { id: string; name: string };
  tapePackaging?: { id: string; name: string };
  productGroup?: ProductGroupRef | null;
}

// ── Component ──

export default function ShippingRules() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation('shipping_rules');
  const { t: tCommon } = useTranslation('common');

  const getPriorityLabel = useCallback(
    (p: number) => t(`priority.labels.${p}` as 'priority.labels.1'),
    [t],
  );

  // ── State ──
  const [rules, setRules] = useState<ShippingRule[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inventoryRaw, setInventoryRaw] = useState<any[]>([]);
  const [groups, setGroups] = useState<ProductGroupRef[]>([]);
  const [loading, setLoading] = useState(true);

  // Rule modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Rule form state
  const [name, setName] = useState('');
  const [minItems, setMinItems] = useState('1');
  const [maxItems, setMaxItems] = useState('5');
  const [secondaryPackagingId, setSecondaryPackagingId] = useState('none');
  const [secondaryStaticWeightG, setSecondaryStaticWeightG] = useState('');
  const [fillerPackagingId, setFillerPackagingId] = useState('none');
  const [fillerStaticWeightG, setFillerStaticWeightG] = useState('');
  const [tapePackagingId, setTapePackagingId] = useState('none');
  const [tapeStaticWeightG, setTapeStaticWeightG] = useState('');
  const [productGroupId, setProductGroupId] = useState('none');
  const [priority, setPriority] = useState(2);
  const [isActive, setIsActive] = useState(true);

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Data Loading ──

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesData, invData, groupsData] = await Promise.all([
        apiFetch('/orders/shipping-rules'),
        apiFetch('/packaging/inventory'),
        apiFetch('/products/groups'),
      ]);
      setRules(rulesData);
      setInventoryRaw(invData);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (e) {
      toast.error(t('toasts.load_failed'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Inventory options, filtered by packaging type category ──
  const optionsByCategory = useMemo(() => {
    const categorise = (cat: 'PRIMARY' | 'FILLER' | 'TAPE') => [
      { label: t('modal.form.none_option'), value: 'none' },
      ...inventoryRaw
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((i: any) => i?.packagingType?.category === cat)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((i: any) => ({ label: i.name, value: i.id })),
    ];
    return {
      secondary: categorise('PRIMARY'),
      filler: categorise('FILLER'),
      tape: categorise('TAPE'),
    };
  }, [inventoryRaw, t]);

  const lookupInventoryName = (id: string | null | undefined): string | undefined => {
    if (!id) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return inventoryRaw.find((i: any) => i.id === id)?.name;
  };

  const isStaticInventoryItem = (id: string | null | undefined): boolean => {
    if (!id || id === 'none') return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = inventoryRaw.find((i: any) => i.id === id);
    const formulaType = inv?.formulaType ?? inv?.packagingType?.formulaType;
    return formulaType === 'STATIC';
  };

  // ── Group options for rule form ──
  const groupOptions = [
    { label: t('modal.form.group_none_option'), value: 'none' },
    ...groups.map((g) => ({ label: g.name, value: g.id })),
  ];

  // ── Handlers ──

  const handleRuleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('toasts.name_required'));
      return;
    }
    setSaving(true);
    const toOverride = (raw: string, id: string) =>
      isStaticInventoryItem(id) && raw.trim() !== '' ? Number(raw) : null;
    const body = {
      name,
      minItems: Number(minItems),
      maxItems: Number(maxItems),
      secondaryPackagingId: secondaryPackagingId === 'none' ? null : secondaryPackagingId,
      secondaryStaticWeightGOverride: toOverride(secondaryStaticWeightG, secondaryPackagingId),
      fillerPackagingId: fillerPackagingId === 'none' ? null : fillerPackagingId,
      fillerStaticWeightGOverride: toOverride(fillerStaticWeightG, fillerPackagingId),
      tapePackagingId: tapePackagingId === 'none' ? null : tapePackagingId,
      tapeStaticWeightGOverride: toOverride(tapeStaticWeightG, tapePackagingId),
      productGroupId: productGroupId === 'none' ? null : productGroupId,
      priority,
      isActive,
    };

    try {
      if (editingRuleId) {
        await apiFetch(`/orders/shipping-rules/${editingRuleId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast.success(t('toasts.updated'));
      } else {
        await apiFetch('/orders/shipping-rules', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast.success(t('toasts.created'));
      }
      setRuleModalOpen(false);
      await loadData();
    } catch (e) {
      toast.error(t('toasts.save_failed'));
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleEditRule = (rule: ShippingRule) => {
    setName(rule.name);
    setMinItems(rule.minItems?.toString() || '1');
    setMaxItems(rule.maxItems?.toString() || '5');
    setSecondaryPackagingId(rule.secondaryPackagingId || 'none');
    setSecondaryStaticWeightG(rule.secondaryStaticWeightGOverride?.toString() ?? '');
    setFillerPackagingId(rule.fillerPackagingId || 'none');
    setFillerStaticWeightG(rule.fillerStaticWeightGOverride?.toString() ?? '');
    setTapePackagingId(rule.tapePackagingId || 'none');
    setTapeStaticWeightG(rule.tapeStaticWeightGOverride?.toString() ?? '');
    setProductGroupId(rule.productGroupId || 'none');
    setPriority(rule.priority || 2);
    setIsActive(rule.isActive);
    setEditingRuleId(rule.id);
    setRuleModalOpen(true);
  };

  const askDeleteRule = (rule: ShippingRule) => {
    setPendingDelete({ id: rule.id, name: rule.name });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/orders/shipping-rules/${pendingDelete.id}`, { method: 'DELETE' });
      toast.success(t('toasts.deleted'));
      await loadData();
    } catch (e) {
      toast.error(t('toasts.delete_failed'));
      console.error(e);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setPendingDelete(null);
    }
  };

  const resetRuleForm = () => {
    setName('');
    setMinItems('1');
    setMaxItems('5');
    setSecondaryPackagingId('none');
    setSecondaryStaticWeightG('');
    setFillerPackagingId('none');
    setFillerStaticWeightG('');
    setTapePackagingId('none');
    setTapeStaticWeightG('');
    setProductGroupId('none');
    setPriority(2);
    setIsActive(true);
    setEditingRuleId(null);
  };

  const toggleActive = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    try {
      await apiFetch(`/orders/shipping-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      toast.success(rule.isActive ? t('toasts.suspended') : t('toasts.activated'));
      await loadData();
    } catch (e) {
      toast.error(t('toasts.toggle_failed'));
      console.error(e);
    }
  };

  // ── Render ──

  const noInventory = !loading && inventoryRaw.length === 0;

  return (
    <Page
      title={t('page.title')}
      subtitle={t('page.subtitle')}
      primaryAction={{
        content: t('page.primary_action'),
        onAction: () => { resetRuleForm(); setRuleModalOpen(true); },
        disabled: noInventory,
      }}
      secondaryActions={[
        {
          content: t('page.secondary_action_groups'),
          onAction: () => navigate('/groups'),
        },
      ]}
    >
      <Layout>
        {noInventory && (
          <Layout.Section>
            <Banner
              tone="warning"
              title={t('no_inventory_banner.title')}
              action={{ content: t('no_inventory_banner.cta'), onAction: () => navigate('/inventory') }}
            >
              <p>{t('no_inventory_banner.body')}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <BlockStack gap="400">
            {rules.map((item) => {
              const groupLabel = item.productGroup?.name ?? null;
              const hasMax = typeof item.maxItems === 'number' && item.maxItems > 0;

              return (
                <Card key={item.id} padding="400">
                  <InlineStack align="space-between" blockAlign="center" gap="400">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingMd">{item.name}</Text>
                        <Badge tone={item.isActive ? 'success' : 'critical'}>
                          {item.isActive ? t('status.active') : t('status.inactive')}
                        </Badge>
                        <Badge tone="info">{t('priority.with_label', { level: getPriorityLabel(item.priority) })}</Badge>
                        {groupLabel
                          ? <Badge tone="warning">{groupLabel}</Badge>
                          : <Badge tone="attention">{t('status.catch_all')}</Badge>}
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        {hasMax
                          ? t('rule_card.range_with_max', { min: item.minItems, max: item.maxItems })
                          : t('rule_card.range_without_max', { min: item.minItems })}
                        {groupLabel
                          ? t('rule_card.scope_group_suffix', { group: groupLabel })
                          : t('rule_card.catch_all_suffix')}
                      </Text>
                      <InlineStack gap="400">
                        {item.secondaryPackagingId && (() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const inv = inventoryRaw.find((i: any) => i.id === item.secondaryPackagingId);
                          const imgUrl = inv?.packagingType?.imageUrl || FALLBACK_PACKAGING_IMAGE_URL;
                          return (
                            <InlineStack gap="200" blockAlign="center">
                              <Thumbnail source={imgUrl} alt={inv?.packagingType?.agnosticMaterial || inv?.agnosticMaterial || 'packaging'} size="small" />
                              <Text as="span" variant="bodySm">
                                <b>{t('rule_card.secondary_label')}:</b> {item.secondaryPackaging?.name || lookupInventoryName(item.secondaryPackagingId) || item.secondaryPackagingId}
                              </Text>
                            </InlineStack>
                          );
                        })()}
                        {item.fillerPackagingId && (() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const inv = inventoryRaw.find((i: any) => i.id === item.fillerPackagingId);
                          const imgUrl = inv?.packagingType?.imageUrl || FALLBACK_PACKAGING_IMAGE_URL;
                          return (
                            <InlineStack gap="200" blockAlign="center">
                              <Thumbnail source={imgUrl} alt={inv?.packagingType?.agnosticMaterial || inv?.agnosticMaterial || 'packaging'} size="small" />
                              <Text as="span" variant="bodySm">
                                <b>{t('rule_card.filler_label')}:</b> {item.fillerPackaging?.name || lookupInventoryName(item.fillerPackagingId) || item.fillerPackagingId}
                              </Text>
                            </InlineStack>
                          );
                        })()}
                        {item.tapePackagingId && (() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const inv = inventoryRaw.find((i: any) => i.id === item.tapePackagingId);
                          const imgUrl = inv?.packagingType?.imageUrl || FALLBACK_PACKAGING_IMAGE_URL;
                          return (
                            <InlineStack gap="200" blockAlign="center">
                              <Thumbnail source={imgUrl} alt={inv?.packagingType?.agnosticMaterial || inv?.agnosticMaterial || 'packaging'} size="small" />
                              <Text as="span" variant="bodySm">
                                <b>{t('rule_card.tape_label')}:</b> {item.tapePackaging?.name || lookupInventoryName(item.tapePackagingId) || item.tapePackagingId}
                              </Text>
                            </InlineStack>
                          );
                        })()}
                        {!item.secondaryPackagingId && !item.fillerPackagingId && !item.tapePackagingId && (
                          <Text as="span" variant="bodySm" tone="subdued">{t('rule_card.no_components')}</Text>
                        )}
                      </InlineStack>
                    </BlockStack>
                    <InlineStack gap="200">
                      <Button onClick={() => toggleActive(item.id)} tone={item.isActive ? 'critical' : 'success'}>
                        {item.isActive ? t('rule_card.actions.suspend') : t('rule_card.actions.activate')}
                      </Button>
                      <Button icon={EditIcon} onClick={() => handleEditRule(item)}>{tCommon('actions.edit')}</Button>
                      <Button tone="critical" icon={DeleteIcon} onClick={() => askDeleteRule(item)}>{tCommon('actions.delete')}</Button>
                    </InlineStack>
                  </InlineStack>
                </Card>
              );
            })}
            {rules.length === 0 && !loading && !noInventory && (
              <Card padding="400">
                <BlockStack gap="200">
                  <Text as="p" tone="subdued">{t('empty_state.heading')}</Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    {t('empty_state.body')}
                  </Text>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* ── Rule Modal ── */}
      <Modal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRuleId ? t('modal.title_edit') : t('modal.title_new')}
        primaryAction={{ content: t('modal.primary'), onAction: handleRuleSubmit, loading: saving, disabled: !name.trim() }}
        secondaryActions={[{ content: tCommon('actions.cancel'), onAction: () => setRuleModalOpen(false) }]}
      >
        <Modal.Section>
          <Form onSubmit={handleRuleSubmit}>
            <FormLayout>
              <div data-tour="rules-modal-name">
                <TextField
                  label={t('modal.form.name_label')}
                  value={name}
                  onChange={setName}
                  autoComplete="off"
                  placeholder={t('modal.form.name_placeholder')}
                  helpText={t('modal.form.name_help')}
                />
              </div>
              <div data-tour="rules-modal-range">
                <FormLayout.Group>
                  <TextField label={t('modal.form.min_items_label')} type="number" value={minItems} onChange={setMinItems} autoComplete="off" min={1} />
                  <TextField label={t('modal.form.max_items_label')} type="number" value={maxItems} onChange={setMaxItems} autoComplete="off" min={1} helpText={t('modal.form.max_items_help')} />
                </FormLayout.Group>
              </div>
              <div data-tour="rules-modal-group">
                <BlockStack gap="100">
                  <PolarisSelect
                    label={t('modal.form.group_label')}
                    options={groupOptions}
                    value={productGroupId}
                    onChange={setProductGroupId}
                  />
                  <Text as="p" variant="bodySm" tone="subdued">
                    {groups.length === 0 ? t('modal.form.group_help_empty') : t('modal.form.group_help_with_groups')}
                  </Text>
                </BlockStack>
              </div>
              <div data-tour="rules-modal-secondary">
                <BlockStack gap="100">
                  <PolarisSelect
                    label={t('modal.form.secondary_label')}
                    options={optionsByCategory.secondary}
                    value={secondaryPackagingId}
                    onChange={setSecondaryPackagingId}
                  />
                  <Text as="p" variant="bodySm" tone="subdued">{t('modal.form.secondary_help')}</Text>
                  {isStaticInventoryItem(secondaryPackagingId) && (
                    <TextField
                      label={t('modal.form.weight_override_label')}
                      type="number"
                      value={secondaryStaticWeightG}
                      onChange={setSecondaryStaticWeightG}
                      autoComplete="off"
                      min={0}
                      helpText={t('modal.form.weight_override_help')}
                    />
                  )}
                </BlockStack>
              </div>
              <div data-tour="rules-modal-filler">
                <BlockStack gap="100">
                  <PolarisSelect
                    label={t('modal.form.filler_label')}
                    options={optionsByCategory.filler}
                    value={fillerPackagingId}
                    onChange={setFillerPackagingId}
                  />
                  <Text as="p" variant="bodySm" tone="subdued">{t('modal.form.filler_help')}</Text>
                  {isStaticInventoryItem(fillerPackagingId) && (
                    <TextField
                      label={t('modal.form.weight_override_label')}
                      type="number"
                      value={fillerStaticWeightG}
                      onChange={setFillerStaticWeightG}
                      autoComplete="off"
                      min={0}
                      helpText={t('modal.form.weight_override_help')}
                    />
                  )}
                </BlockStack>
              </div>
              <div data-tour="rules-modal-tape">
                <BlockStack gap="100">
                  <PolarisSelect
                    label={t('modal.form.tape_label')}
                    options={optionsByCategory.tape}
                    value={tapePackagingId}
                    onChange={setTapePackagingId}
                  />
                  <Text as="p" variant="bodySm" tone="subdued">{t('modal.form.tape_help')}</Text>
                  {isStaticInventoryItem(tapePackagingId) && (
                    <TextField
                      label={t('modal.form.weight_override_label')}
                      type="number"
                      value={tapeStaticWeightG}
                      onChange={setTapeStaticWeightG}
                      autoComplete="off"
                      min={0}
                      helpText={t('modal.form.weight_override_help')}
                    />
                  )}
                </BlockStack>
              </div>
              <RangeSlider
                label={t('priority.with_label', { level: getPriorityLabel(priority) })}
                value={priority}
                min={1}
                max={4}
                step={1}
                output
                onChange={(val) => setPriority(val as number)}
                helpText={t('modal.form.priority_help')}
              />
              <Checkbox label={t('modal.form.active_label')} checked={isActive} onChange={setIsActive} />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setPendingDelete(null); }}
        title={t('delete_modal.title')}
        primaryAction={{
          content: t('delete_modal.primary'),
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
                ns="shipping_rules"
                i18nKey="delete_modal.body"
                values={{ name: pendingDelete?.name ?? '' }}
                components={{ strong: <strong /> }}
              />
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              {t('delete_modal.irreversible_note')}
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
