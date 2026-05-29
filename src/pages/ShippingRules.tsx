import { useState, useEffect, useCallback } from 'react';
import {
  Page, Layout, Card, Text, Button, Modal, Form, FormLayout,
  TextField, Checkbox, InlineStack, BlockStack, Badge, Box,
  Thumbnail, RangeSlider, Tabs, Banner, Tag, OptionList, Scrollable
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';
import { PolarisSelect } from '../components/PolarisSelect';


// ── Types ──

interface ProductGroup {
  id: string;
  name: string;
  matchType: 'MANUAL' | 'PRODUCT_TYPE' | 'TAG';
  matchValue: string | null;
  members?: { shopifyProductId: number }[];
}

interface ShippingRule {
  id: string;
  name: string;
  minItems: number;
  maxItems: number;
  secondaryPackagingId: string | null;
  fillerPackagingId: string | null;
  productGroupId: string | null;
  priority: number;
  isActive: boolean;
  secondaryPackaging?: { id: string; name: string };
  fillerPackaging?: { id: string; name: string };
  productGroup?: ProductGroup | null;
}

// ── Constants ──

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Minima',
  2: 'Media',
  3: 'Alta',
  4: 'Massima',
};

const getPriorityLabel = (p: number) => PRIORITY_LABELS[p] || p;

const MATCH_TYPE_LABELS: Record<string, string> = {
  MANUAL: 'Manuale',
  PRODUCT_TYPE: 'Tipo Prodotto Shopify',
  TAG: 'Tag Prodotto',
};

// ── Component ──

export default function ShippingRules() {
  const [selectedTab, setSelectedTab] = useState(0);

  // ── Rules State ──
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [inventory, setInventory] = useState<{ label: string, value: string }[]>([]);
  const [inventoryRaw, setInventoryRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Rule Form State
  const [name, setName] = useState('');
  const [minItems, setMinItems] = useState('1');
  const [maxItems, setMaxItems] = useState('5');
  const [secondaryPackagingId, setSecondaryPackagingId] = useState('none');
  const [fillerPackagingId, setFillerPackagingId] = useState('none');
  const [productGroupId, setProductGroupId] = useState('none');
  const [priority, setPriority] = useState(2);
  const [isActive, setIsActive] = useState(true);

  // ── Groups State ──
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Group Form State
  const [groupName, setGroupName] = useState('');
  const [matchType, setMatchType] = useState<'MANUAL' | 'PRODUCT_TYPE' | 'TAG'>('PRODUCT_TYPE');
  const [matchValue, setMatchValue] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [shopifyProducts, setShopifyProducts] = useState<{label: string, value: string}[]>([]);
  const [syncingGroups, setSyncingGroups] = useState(false);

  // ── Data Loading ──

  const loadRulesData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesData, invData] = await Promise.all([
        apiFetch('/orders/shipping-rules'),
        apiFetch('/packaging/inventory')
      ]);
      setRules(rulesData);
      setInventoryRaw(invData);
      setInventory(invData.map((i: any) => ({ label: i.name, value: i.id })));
    } catch (e) {
      console.error("Failed to load rules", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGroupsData = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const groupsData = await apiFetch('/products/groups');
      setGroups(groupsData);
    } catch (e) {
      console.error("Failed to load groups", e);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const loadProductsData = useCallback(async () => {
    try {
      const data = await apiFetch('/products/shopify-list');
      if (data && data.data) {
        setShopifyProducts(data.data.map((p: any) => ({ label: p.title, value: p.id.toString() })));
      }
    } catch (e) {
      console.error("Failed to load products", e);
    }
  }, []);

  useEffect(() => {
    loadRulesData();
    loadGroupsData();
    loadProductsData();
  }, [loadRulesData, loadGroupsData, loadProductsData]);

  // ── Group options for rule form ──
  const groupOptions = [
    { label: 'Nessuno (Catch-all)', value: 'none' },
    ...groups.map(g => ({ label: g.name, value: g.id })),
  ];

  // ── Rule Handlers ──

  const handleRuleSubmit = async () => {
    const body: any = {
      name,
      minItems: Number(minItems),
      maxItems: Number(maxItems),
      secondaryPackagingId: secondaryPackagingId === 'none' ? null : secondaryPackagingId,
      fillerPackagingId: fillerPackagingId === 'none' ? null : fillerPackagingId,
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
      } else {
        await apiFetch('/orders/shipping-rules', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      await loadRulesData();
    } catch (e) {
      console.error('Failed to save rule', e);
    }

    setRuleModalOpen(false);
  };

  const handleEditRule = (rule: ShippingRule) => {
    setName(rule.name);
    setMinItems(rule.minItems?.toString() || '1');
    setMaxItems(rule.maxItems?.toString() || '5');
    setSecondaryPackagingId(rule.secondaryPackagingId || 'none');
    setFillerPackagingId(rule.fillerPackagingId || 'none');
    setProductGroupId(rule.productGroupId || 'none');
    setPriority(rule.priority || 2);
    setIsActive(rule.isActive);
    setEditingRuleId(rule.id);
    setRuleModalOpen(true);
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await apiFetch(`/orders/shipping-rules/${id}`, { method: 'DELETE' });
      await loadRulesData();
    } catch (e) {
      console.error('Failed to delete rule', e);
    }
  };

  const resetRuleForm = () => {
    setName('');
    setMinItems('1');
    setMaxItems('5');
    setSecondaryPackagingId('none');
    setFillerPackagingId('none');
    setProductGroupId('none');
    setPriority(2);
    setIsActive(true);
    setEditingRuleId(null);
  };

  const toggleActive = async (id: string) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    try {
      await apiFetch(`/orders/shipping-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      await loadRulesData();
    } catch (e) {
      console.error('Failed to toggle rule', e);
    }
  };

  // ── Group Handlers ──

  const handleGroupSubmit = async () => {
    const body: any = {
      name: groupName,
      matchType,
      matchValue: matchType !== 'MANUAL' ? matchValue : null,
      shopifyProductIds: matchType === 'MANUAL' ? selectedProductIds.map(Number) : undefined,
    };

    try {
      if (editingGroupId) {
        await apiFetch(`/products/groups/${editingGroupId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/products/groups', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      await loadGroupsData();
      await loadRulesData(); // Refresh rules to pick up group name changes
    } catch (e) {
      console.error('Failed to save group', e);
    }

    setGroupModalOpen(false);
  };

  const handleEditGroup = (group: ProductGroup) => {
    setGroupName(group.name);
    setMatchType(group.matchType);
    setMatchValue(group.matchValue || '');
    setSelectedProductIds(group.members?.map(m => m.shopifyProductId.toString()) || []);
    setEditingGroupId(group.id);
    setGroupModalOpen(true);
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await apiFetch(`/products/groups/${id}`, { method: 'DELETE' });
      await loadGroupsData();
      await loadRulesData(); // Refresh rules since group FK may be nulled
    } catch (e) {
      console.error('Failed to delete group', e);
    }
  };

  const resetGroupForm = () => {
    setGroupName('');
    setMatchType('PRODUCT_TYPE');
    setMatchValue('');
    setSelectedProductIds([]);
    setEditingGroupId(null);
  };

  const handleSyncFromCatalog = async () => {
    setSyncingGroups(true);
    try {
      await apiFetch('/products/groups/sync-from-catalog', { method: 'POST' });
      await loadGroupsData();
    } catch (e) {
      console.error('Failed to sync groups', e);
    } finally {
      setSyncingGroups(false);
    }
  };

  // ── Tabs ──

  const tabs = [
    { id: 'rules', content: `Regole (${rules.length})`, accessibilityLabel: 'Regole di spedizione' },
    { id: 'groups', content: `Gruppi Prodotto (${groups.length})`, accessibilityLabel: 'Gruppi di prodotto' },
  ];

  // ── Render ──

  return (
    <Page
      title="Regole di Spedizione"
      primaryAction={
        selectedTab === 0
          ? { content: 'Nuova Regola', onAction: () => { resetRuleForm(); setRuleModalOpen(true); } }
          : { content: 'Nuovo Gruppo', onAction: () => { resetGroupForm(); setGroupModalOpen(true); } }
      }
    >
      <Layout>
        <Layout.Section>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {selectedTab === 0 ? (
              /* ─── Rules Tab ─── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                {rules.map((item) => {
                  const groupLabel = item.productGroup?.name ?? null;

                  return (
                    <Card key={item.id} padding="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="200">
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="h3" variant="headingMd">{item.name}</Text>
                            <Badge tone={item.isActive ? "success" : "critical"}>{item.isActive ? "Attiva" : "Disattiva"}</Badge>
                            <Badge tone="info">{'Priorità: ' + getPriorityLabel(item.priority)}</Badge>
                            {groupLabel && (
                              <Badge tone="warning">{groupLabel}</Badge>
                            )}
                          </InlineStack>
                          <Text as="p" tone="subdued">
                            Da {item.minItems} a {item.maxItems ?? '∞'} articoli per pacco.
                            {!groupLabel && ' (Catch-all)'}
                          </Text>
                          <InlineStack gap="400">
                            {item.secondaryPackagingId && (() => {
                              const inv = inventoryRaw.find((i: any) => i.id === item.secondaryPackagingId);
                              const imgUrl = inv?.packagingType?.imageUrl;
                              return (
                                <InlineStack gap="200" blockAlign="center">
                                  {imgUrl && <Thumbnail source={imgUrl} alt={inv?.packagingType?.agnosticMaterial || 'packaging'} size="small" />}
                                  <Text as="span" variant="bodySm"><b>Secondario:</b> {item.secondaryPackaging?.name || inventory.find(i => i.value === item.secondaryPackagingId)?.label || item.secondaryPackagingId}</Text>
                                </InlineStack>
                              );
                            })()}
                            {item.fillerPackagingId && (() => {
                              const inv = inventoryRaw.find((i: any) => i.id === item.fillerPackagingId);
                              const imgUrl = inv?.packagingType?.imageUrl;
                              return (
                                <InlineStack gap="200" blockAlign="center">
                                  {imgUrl && <Thumbnail source={imgUrl} alt={inv?.packagingType?.agnosticMaterial || 'packaging'} size="small" />}
                                  <Text as="span" variant="bodySm"><b>Riempimento:</b> {item.fillerPackaging?.name || inventory.find(i => i.value === item.fillerPackagingId)?.label || item.fillerPackagingId}</Text>
                                </InlineStack>
                              );
                            })()}
                          </InlineStack>
                        </BlockStack>
                        <InlineStack gap="200">
                          <Button onClick={() => toggleActive(item.id)} tone={item.isActive ? "critical" : "success"}>
                            {item.isActive ? "Sospendi" : "Attiva"}
                          </Button>
                          <Button icon={EditIcon} onClick={() => handleEditRule(item)}>Modifica</Button>
                          <Button tone="critical" icon={DeleteIcon} onClick={() => handleDeleteRule(item.id)}>Elimina</Button>
                        </InlineStack>
                      </InlineStack>
                    </Card>
                  );
                })}
                {rules.length === 0 && !loading && (
                  <Card padding="400">
                    <Text as="p" tone="subdued">Nessuna regola trovata. Creane una nuova.</Text>
                  </Card>
                )}
              </div>
            ) : (
              /* ─── Groups Tab ─── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <Banner tone="info">
                  <BlockStack gap="200">
                    <p>
                      I gruppi di prodotto permettono di assegnare regole di spedizione diverse
                      a categorie di prodotti diverse. Usa il tipo <b>"Tipo Prodotto Shopify"</b> per
                      un matching automatico basato sul <code>product_type</code> di Shopify.
                    </p>
                    <InlineStack>
                      <Button onClick={handleSyncFromCatalog} loading={syncingGroups}>
                        Importa Tipi dal Catalogo
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Banner>

                {groups.map((group) => {
                  const rulesUsingGroup = rules.filter(r => r.productGroupId === group.id);

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
                              {rulesUsingGroup.map(r => (
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
                          <Button icon={EditIcon} onClick={() => handleEditGroup(group)}>Modifica</Button>
                          <Button tone="critical" icon={DeleteIcon} onClick={() => handleDeleteGroup(group.id)}>Elimina</Button>
                        </InlineStack>
                      </InlineStack>
                    </Card>
                  );
                })}
                {groups.length === 0 && !groupsLoading && (
                  <Card padding="400">
                    <Text as="p" tone="subdued">Nessun gruppo trovato. Crea un gruppo per filtrare le regole per tipo di prodotto.</Text>
                  </Card>
                )}
              </div>
            )}
          </Tabs>
        </Layout.Section>
      </Layout>

      {/* ── Rule Modal ── */}
      <Modal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRuleId ? "Modifica Regola di Imballaggio" : "Nuova Regola di Imballaggio"}
        primaryAction={{ content: 'Salva', onAction: handleRuleSubmit }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setRuleModalOpen(false) }]}
      >
        <Modal.Section>
          <Form onSubmit={handleRuleSubmit}>
            <FormLayout>
              <TextField label="Nome Regola" value={name} onChange={setName} autoComplete="off" />
              <FormLayout.Group>
                <TextField label="Articoli Minimi" type="number" value={minItems} onChange={setMinItems} autoComplete="off" />
                <TextField label="Articoli Massimi" type="number" value={maxItems} onChange={setMaxItems} autoComplete="off" />
              </FormLayout.Group>
              <PolarisSelect label="Gruppo Prodotto (Opzionale)" options={groupOptions} value={productGroupId} onChange={setProductGroupId} />
              <PolarisSelect label="Imballaggio Secondario (Opzionale)" options={[{ label: 'Nessuno', value: 'none' }, ...inventory]} value={secondaryPackagingId} onChange={setSecondaryPackagingId} />
              <PolarisSelect label="Imballaggio di Riempimento (Opzionale)" options={[{ label: 'Nessuno', value: 'none' }, ...inventory]} value={fillerPackagingId} onChange={setFillerPackagingId} />
              <RangeSlider
                label={`Priorità: ${getPriorityLabel(priority)}`}
                value={priority}
                min={1}
                max={4}
                step={1}
                output
                onChange={(val) => setPriority(val as number)}
                helpText="Le regole con priorità più alta vengono valutate prima."
              />
              <Checkbox label="Regola Attiva" checked={isActive} onChange={setIsActive} />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      {/* ── Group Modal ── */}
      <Modal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroupId ? "Modifica Gruppo Prodotto" : "Nuovo Gruppo Prodotto"}
        primaryAction={{ content: 'Salva', onAction: handleGroupSubmit }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setGroupModalOpen(false) }]}
      >
        <Modal.Section>
          <Form onSubmit={handleGroupSubmit}>
            <FormLayout>
              <TextField label="Nome Gruppo" value={groupName} onChange={setGroupName} autoComplete="off" />
              <PolarisSelect
                label="Tipo di Match"
                options={[
                  { label: 'Tipo Prodotto Shopify (automatico)', value: 'PRODUCT_TYPE' },
                  { label: 'Tag Prodotto (automatico)', value: 'TAG' },
                  { label: 'Selezione Manuale', value: 'MANUAL' },
                ]}
                value={matchType}
                onChange={(val) => setMatchType(val as any)}
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
    </Page>
  );
}
