import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Text, Button, Collapsible, Icon, Modal, Form, FormLayout, TextField, Box, BlockStack, InlineStack, EmptyState, Tabs, Banner } from '@shopify/polaris';
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';
import { useTranslation, Trans } from 'react-i18next';
import { apiFetch } from '../utils/api';
import { useToast } from '../utils/toast';
import { PolarisSelect } from '../components/PolarisSelect';
import { PackagingCard, type InventoryItem } from '../components/PackagingCard';
import { AISuggestion } from '../components/AISuggestion';


interface PackagingType {
  id: string;
  name: string;
  agnosticMaterial: string;
  category: 'PRIMARY' | 'TAPE' | 'FILLER';
  defaultGsm?: number;
  defaultStaticWeightG?: number;
  formulaType?: string;
  defaultOverlapFactor?: number;
  defaultLMm?: number;
  defaultWMm?: number;
  defaultHMm?: number;
}

export default function Inventory() {
  const toast = useToast();
  const { t } = useTranslation('packaging_inventory');
  const { t: tCommon } = useTranslation('common');
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
  const [customStaticWeightG, setCustomStaticWeightG] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedMaterials, setExpandedMaterials] = useState<Record<string, boolean>>({});

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
      toast.error(t('toasts.load_failed'));
      console.error('Failed to load inventory', e);
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const selectedType = standardTypes.find(t => t.id === packagingTypeId);
    const isStatic = selectedType?.formulaType === 'STATIC';
    const bodyParams = {
      packagingTypeId,
      name,
      lMm: length ? Number(length) : null,
      wMm: width ? Number(width) : null,
      hMm: height ? Number(height) : null,
      customGsm: !isStatic && customGsm ? Number(customGsm) : null,
      customStaticWeightG: isStatic && customStaticWeightG ? Number(customStaticWeightG) : null,
      role: 'PRIMARY'
    };

    try {
      if (editingItemId) {
        await apiFetch(`/packaging/inventory/${editingItemId}`, {
          method: 'PATCH',
          body: JSON.stringify(bodyParams)
        });
        toast.success(t('toasts.updated'));
      } else {
        await apiFetch('/packaging/inventory', {
          method: 'POST',
          body: JSON.stringify(bodyParams)
        });
        toast.success(t('toasts.added'));
      }
      closeModal();
      loadData();
    } catch (e) {
      toast.error(t('toasts.save_failed'));
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
    setCustomStaticWeightG('');
    setEditingItemId(null);
    setShowCustomForm(false);
    setSelectedTab(0);
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
    setCustomStaticWeightG(item.customStaticWeightG?.toString() || '');
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
    if (type.formulaType === 'STATIC') {
      setCustomGsm('');
      setCustomStaticWeightG(type.defaultStaticWeightG?.toString() || '');
    } else {
      setCustomGsm(type.defaultGsm?.toString() || '');
      setCustomStaticWeightG('');
    }
    setShowCustomForm(true);
  };

  const handleAcceptSuggested = async (item: InventoryItem) => {
    setSubmitting(true);
    try {
      await apiFetch(`/packaging/inventory/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true })
      });
      toast.success(t('toasts.suggestion_accepted'));
      loadData();
    } catch (e) {
      toast.error(t('toasts.suggestion_accept_failed'));
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
      toast.success(t('toasts.added'));
      closeModal();
      loadData();
    } catch (e) {
      toast.error(t('toasts.add_failed'));
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
      toast.success(t('toasts.deleted'));
    } catch (e) {
      // rollback
      setItems(optimistic);
      toast.error(t('toasts.delete_failed'));
      console.error(e);
    }
  };

  const categoryTabs = [
    { id: 'cat-all', content: t('modal.category_filters.ALL'), accessibilityLabel: 'ALL', panelID: 'panel-cat-all', _category: 'ALL' as const },
    { id: 'cat-primary', content: t('modal.category_filters.PRIMARY'), accessibilityLabel: 'PRIMARY', panelID: 'panel-cat-primary', _category: 'PRIMARY' as const },
    { id: 'cat-tape', content: t('modal.category_filters.TAPE'), accessibilityLabel: 'TAPE', panelID: 'panel-cat-tape', _category: 'TAPE' as const },
    { id: 'cat-filler', content: t('modal.category_filters.FILLER'), accessibilityLabel: 'FILLER', panelID: 'panel-cat-filler', _category: 'FILLER' as const },
  ];

  const currentCategory = categoryTabs[selectedTab]?._category ?? 'ALL';
  const typesForCurrentTab = standardTypes.filter(
    t => currentCategory === 'ALL' || t.category === currentCategory
  );
  const groupedTypesForTab = typesForCurrentTab.reduce((acc, curr) => {
    if (!acc[curr.agnosticMaterial]) acc[curr.agnosticMaterial] = [];
    acc[curr.agnosticMaterial].push(curr);
    return acc;
  }, {} as Record<string, PackagingType[]>);

  const activeItems = items.filter(i => i.isActive && (!i.isAiSuggested || i.isConfirmed));
  const suggestedItems = items.filter(i => i.isAiSuggested && !i.isConfirmed);

  const hasTape = activeItems.some(i => i.packagingType?.category === 'TAPE');
  const hasFiller = activeItems.some(i => i.packagingType?.category === 'FILLER');
  const missingCategories: Array<'TAPE' | 'FILLER'> = [];
  if (!hasTape) missingCategories.push('TAPE');
  if (!hasFiller) missingCategories.push('FILLER');

  const isCustomFormVisible = editingItemId !== null || showCustomForm;

  const modalTitle = editingItemId
    ? t('modal.title_edit')
    : showCustomForm
      ? t('modal.title_customize')
      : t('modal.title_add');

  const missingCategoriesText = missingCategories
    .map((key) => t(`warnings.categories.${key}` as 'warnings.categories.TAPE'))
    .join(t('warnings.join_and'));

  return (
    <Page
      title={t('page.title')}
      subtitle={t('page.subtitle')}
      primaryAction={{
        content: t('page.primary_action'),
        onAction: () => { resetForm(); setModalOpen(true); }
      }}
    >
      <Layout>
        {!loading && activeItems.length > 0 && missingCategories.length > 0 && (
          <Layout.Section>
            <Banner
              tone="warning"
              title={t('warnings.missing_categories_title')}
              action={{
                content: t('warnings.missing_categories_cta'),
                onAction: () => { resetForm(); setModalOpen(true); },
              }}
            >
              <p>
                <Trans
                  ns="packaging_inventory"
                  i18nKey="warnings.missing_categories_body"
                  values={{ categories: missingCategoriesText }}
                  components={{ strong: <strong /> }}
                />
              </p>
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <div data-tour="inventory-items">
          <Card padding="0">
            {items.length === 0 && !loading ? (
              <EmptyState
                heading={t('empty_state.heading')}
                action={{ content: t('empty_state.cta'), onAction: () => { resetForm(); setModalOpen(true); } }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p">{t('empty_state.body')}</Text>
              </EmptyState>
            ) : (
              <BlockStack gap="025">
                {suggestedItems.length > 0 && (
                  <AISuggestion.Section
                    subtitle={t('ai_section.subtitle')}
                    count={suggestedItems.length}
                  >
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
                  </AISuggestion.Section>
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
          </div>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        primaryAction={isCustomFormVisible ? {
          content: tCommon('actions.save'),
          onAction: handleSubmit,
          loading: submitting,
        } : undefined}
        secondaryActions={[
          {
            content: tCommon('actions.cancel'),
            onAction: closeModal,
          },
        ]}
      >
        <Modal.Section>
          {!isCustomFormVisible && standardTypes.length > 0 ? (
            <BlockStack gap="400">
              <div data-tour="inventory-modal-categories">
              <Tabs tabs={categoryTabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Box paddingBlockStart="400">
                  {typesForCurrentTab.length > 0 ? (
                    <BlockStack gap="400">
                      {Object.entries(groupedTypesForTab).map(([material, types], idx) => {
                        const isExpanded = expandedMaterials[material] ?? true;
                        return (
                          <BlockStack key={material} gap="0">
                            <button
                              type="button"
                              onClick={() => setExpandedMaterials(prev => ({ ...prev, [material]: !isExpanded }))}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                width: '100%',
                                padding: '8px 0',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ display: 'inline-flex', width: '20px', height: '20px', flexShrink: 0 }}>
                                <Icon source={isExpanded ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
                              </span>
                              <Text as="h3" variant="headingSm">{tCommon(`materials.${material}` as 'materials.PAPER')}</Text>
                            </button>
                            <Collapsible open={isExpanded} id={`collapsible-${material}`}>
                              <Box paddingBlockStart="300" paddingBlockEnd="100">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                                  {types.map(type => (
                                    <Card key={type.id} padding="300" background="bg-surface-secondary">
                                      <BlockStack gap="150">
                                        <Text as="span" variant="bodyMd" fontWeight="semibold">{type.name}</Text>
                                        {type.formulaType === 'STATIC' ? (
                                          type.defaultStaticWeightG != null && (
                                            <Text as="span" tone="subdued" variant="bodySm">{tCommon('units.weight_g', { value: type.defaultStaticWeightG })}</Text>
                                          )
                                        ) : (
                                          type.defaultGsm != null && (
                                            <Text as="span" tone="subdued" variant="bodySm">{tCommon('units.gsm', { value: type.defaultGsm })}</Text>
                                          )
                                        )}
                                        <InlineStack gap="100" align="end">
                                          <Button size="micro" onClick={() => handleEditStandardType(type)}>{t('modal.standard_card.customize_cta')}</Button>
                                          <Button size="micro" tone="success" onClick={() => handleAcceptType(type)} loading={submitting}>{t('modal.standard_card.add_cta')}</Button>
                                        </InlineStack>
                                      </BlockStack>
                                    </Card>
                                  ))}
                                </div>
                              </Box>
                            </Collapsible>
                          </BlockStack>
                        );
                      })}
                    </BlockStack>
                  ) : (
                    <Box paddingBlockStart="200" paddingBlockEnd="200">
                      <Text as="p" tone="subdued">{t('modal.no_types_for_category')}</Text>
                    </Box>
                  )}
                </Box>
              </Tabs>
              </div>
              <Box borderBlockStartWidth="025" borderColor="border" paddingBlockStart="400">
                <Button onClick={() => setShowCustomForm(true)}>{t('modal.create_custom_cta')}</Button>
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
                  {t('modal.back_to_standard_cta')}
                </Button>
              )}
              <Form onSubmit={handleSubmit}>
                <FormLayout>
                  <TextField
                    label={t('modal.form.name_label')}
                    value={name}
                    onChange={setName}
                    autoComplete="off"
                    placeholder={t('modal.form.name_placeholder')}
                    helpText={t('modal.form.name_help')}
                  />
                  <PolarisSelect
                    label={t('modal.form.type_label')}
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
                    <TextField label={t('modal.form.length_label')} value={length} onChange={setLength} type="number" autoComplete="off" />
                    <TextField label={t('modal.form.width_label')} value={width} onChange={setWidth} type="number" autoComplete="off" />
                    {standardTypes.find(t => t.id === packagingTypeId)?.defaultHMm !== null && (
                      <TextField label={t('modal.form.height_label')} value={height} onChange={setHeight} type="number" autoComplete="off" />
                    )}
                    {standardTypes.find(t => t.id === packagingTypeId)?.formulaType === 'STATIC' ? (
                      <TextField
                        label={t('modal.form.custom_static_weight_g_label')}
                        value={customStaticWeightG}
                        onChange={setCustomStaticWeightG}
                        type="number"
                        autoComplete="off"
                        helpText={t('modal.form.custom_static_weight_g_help')}
                      />
                    ) : (
                      <TextField
                        label={t('modal.form.custom_gsm_label')}
                        value={customGsm}
                        onChange={setCustomGsm}
                        type="number"
                        autoComplete="off"
                        helpText={t('modal.form.custom_gsm_help')}
                      />
                    )}
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
