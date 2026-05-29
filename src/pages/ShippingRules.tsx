import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page, Layout, Card, Text, Button, Modal, Form, FormLayout,
  TextField, Checkbox, InlineStack, BlockStack, Badge, Banner,
  Thumbnail, RangeSlider,
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useToast } from '../utils/toast';
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
  fillerPackagingId: string | null;
  tapePackagingId: string | null;
  productGroupId: string | null;
  priority: number;
  isActive: boolean;
  secondaryPackaging?: { id: string; name: string };
  fillerPackaging?: { id: string; name: string };
  tapePackaging?: { id: string; name: string };
  productGroup?: ProductGroupRef | null;
}

// ── Constants ──

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Minima',
  2: 'Media',
  3: 'Alta',
  4: 'Massima',
};

const getPriorityLabel = (p: number) => PRIORITY_LABELS[p] || p;

// ── Component ──

export default function ShippingRules() {
  const navigate = useNavigate();
  const toast = useToast();

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
  const [fillerPackagingId, setFillerPackagingId] = useState('none');
  const [tapePackagingId, setTapePackagingId] = useState('none');
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
      toast.error('Impossibile caricare le regole');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Inventory options, filtered by packaging type category ──
  // PRIMARY → scatole/buste (used as outer box / "secondario")
  // FILLER  → riempimento
  // TAPE    → nastro adesivo
  const optionsByCategory = useMemo(() => {
    const categorise = (cat: 'PRIMARY' | 'FILLER' | 'TAPE') => [
      { label: 'Nessuno', value: 'none' },
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
  }, [inventoryRaw]);

  const lookupInventoryName = (id: string | null | undefined): string | undefined => {
    if (!id) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return inventoryRaw.find((i: any) => i.id === id)?.name;
  };

  // ── Group options for rule form ──
  const groupOptions = [
    { label: 'Nessuno (Catch-all)', value: 'none' },
    ...groups.map((g) => ({ label: g.name, value: g.id })),
  ];

  // ── Handlers ──

  const handleRuleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Inserisci un nome per la regola');
      return;
    }
    setSaving(true);
    const body = {
      name,
      minItems: Number(minItems),
      maxItems: Number(maxItems),
      secondaryPackagingId: secondaryPackagingId === 'none' ? null : secondaryPackagingId,
      fillerPackagingId: fillerPackagingId === 'none' ? null : fillerPackagingId,
      tapePackagingId: tapePackagingId === 'none' ? null : tapePackagingId,
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
        toast.success('Regola aggiornata');
      } else {
        await apiFetch('/orders/shipping-rules', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast.success('Regola creata');
      }
      setRuleModalOpen(false);
      await loadData();
    } catch (e) {
      toast.error('Errore durante il salvataggio');
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
    setFillerPackagingId(rule.fillerPackagingId || 'none');
    setTapePackagingId(rule.tapePackagingId || 'none');
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
      toast.success('Regola eliminata');
      await loadData();
    } catch (e) {
      toast.error('Errore durante l\'eliminazione');
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
    setFillerPackagingId('none');
    setTapePackagingId('none');
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
      toast.success(rule.isActive ? 'Regola sospesa' : 'Regola attivata');
      await loadData();
    } catch (e) {
      toast.error('Errore durante l\'aggiornamento');
      console.error(e);
    }
  };

  // ── Render ──

  const noInventory = !loading && inventoryRaw.length === 0;

  return (
    <Page
      title="Regole di Spedizione"
      subtitle="Definisci come comporre i pacchi (scatole esterne + filler) in base al numero di articoli per ordine."
      primaryAction={{
        content: 'Nuova Regola',
        onAction: () => { resetRuleForm(); setRuleModalOpen(true); },
        disabled: noInventory,
      }}
      secondaryActions={[
        {
          content: 'Gestisci gruppi',
          onAction: () => navigate('/groups'),
        },
      ]}
    >
      <Layout>
        {noInventory && (
          <Layout.Section>
            <Banner
              tone="warning"
              title="Configura prima l'inventario imballaggi"
              action={{ content: 'Vai a Inventario', onAction: () => navigate('/inventory') }}
            >
              <p>
                Per creare regole di spedizione devi prima aver censito gli imballaggi
                secondari (scatole esterne) e di riempimento nell'inventario.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <BlockStack gap="400">
            {rules.map((item) => {
              const groupLabel = item.productGroup?.name ?? null;

              return (
                <Card key={item.id} padding="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingMd">{item.name}</Text>
                        <Badge tone={item.isActive ? 'success' : 'critical'}>
                          {item.isActive ? 'Attiva' : 'Disattiva'}
                        </Badge>
                        <Badge tone="info">{'Priorità: ' + getPriorityLabel(item.priority)}</Badge>
                        {groupLabel && <Badge tone="warning">{groupLabel}</Badge>}
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        Da {item.minItems} a {item.maxItems ?? '∞'} articoli per pacco.
                        {!groupLabel && ' (Catch-all)'}
                      </Text>
                      <InlineStack gap="400">
                        {item.secondaryPackagingId && (() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const inv = inventoryRaw.find((i: any) => i.id === item.secondaryPackagingId);
                          const imgUrl = inv?.packagingType?.imageUrl;
                          return (
                            <InlineStack gap="200" blockAlign="center">
                              {imgUrl && <Thumbnail source={imgUrl} alt={inv?.packagingType?.agnosticMaterial || 'packaging'} size="small" />}
                              <Text as="span" variant="bodySm">
                                <b>Secondario:</b> {item.secondaryPackaging?.name || lookupInventoryName(item.secondaryPackagingId) || item.secondaryPackagingId}
                              </Text>
                            </InlineStack>
                          );
                        })()}
                        {item.fillerPackagingId && (() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const inv = inventoryRaw.find((i: any) => i.id === item.fillerPackagingId);
                          const imgUrl = inv?.packagingType?.imageUrl;
                          return (
                            <InlineStack gap="200" blockAlign="center">
                              {imgUrl && <Thumbnail source={imgUrl} alt={inv?.packagingType?.agnosticMaterial || 'packaging'} size="small" />}
                              <Text as="span" variant="bodySm">
                                <b>Riempimento:</b> {item.fillerPackaging?.name || lookupInventoryName(item.fillerPackagingId) || item.fillerPackagingId}
                              </Text>
                            </InlineStack>
                          );
                        })()}
                        {item.tapePackagingId && (() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const inv = inventoryRaw.find((i: any) => i.id === item.tapePackagingId);
                          const imgUrl = inv?.packagingType?.imageUrl;
                          return (
                            <InlineStack gap="200" blockAlign="center">
                              {imgUrl && <Thumbnail source={imgUrl} alt={inv?.packagingType?.agnosticMaterial || 'packaging'} size="small" />}
                              <Text as="span" variant="bodySm">
                                <b>Tape:</b> {item.tapePackaging?.name || lookupInventoryName(item.tapePackagingId) || item.tapePackagingId}
                              </Text>
                            </InlineStack>
                          );
                        })()}
                      </InlineStack>
                    </BlockStack>
                    <InlineStack gap="200">
                      <Button onClick={() => toggleActive(item.id)} tone={item.isActive ? 'critical' : 'success'}>
                        {item.isActive ? 'Sospendi' : 'Attiva'}
                      </Button>
                      <Button icon={EditIcon} onClick={() => handleEditRule(item)}>Modifica</Button>
                      <Button tone="critical" icon={DeleteIcon} onClick={() => askDeleteRule(item)}>Elimina</Button>
                    </InlineStack>
                  </InlineStack>
                </Card>
              );
            })}
            {rules.length === 0 && !loading && !noInventory && (
              <Card padding="400">
                <BlockStack gap="200">
                  <Text as="p" tone="subdued">Nessuna regola di spedizione configurata.</Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Crea la prima regola per definire come comporre i pacchi in uscita.
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
        title={editingRuleId ? 'Modifica Regola di Imballaggio' : 'Nuova Regola di Imballaggio'}
        primaryAction={{ content: 'Salva', onAction: handleRuleSubmit, loading: saving }}
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
              <BlockStack gap="100">
                <PolarisSelect
                  label="Gruppo Prodotto (Opzionale)"
                  options={groupOptions}
                  value={productGroupId}
                  onChange={setProductGroupId}
                />
                <Text as="p" variant="bodySm" tone="subdued">
                  {groups.length === 0
                    ? 'Non hai ancora gruppi. Creane uno in "Gestisci gruppi" per applicare regole solo a una categoria di prodotti.'
                    : 'Lascia "Nessuno" per applicare la regola a tutti i prodotti (catch-all).'}
                </Text>
              </BlockStack>
              <PolarisSelect
                label="Imballaggio Secondario (Opzionale)"
                options={optionsByCategory.secondary}
                value={secondaryPackagingId}
                onChange={setSecondaryPackagingId}
              />
              <PolarisSelect
                label="Imballaggio di Riempimento (Opzionale)"
                options={optionsByCategory.filler}
                value={fillerPackagingId}
                onChange={setFillerPackagingId}
              />
              <PolarisSelect
                label="Nastro Adesivo (Opzionale)"
                options={optionsByCategory.tape}
                value={tapePackagingId}
                onChange={setTapePackagingId}
              />
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

      {/* ── Delete Confirmation Modal ── */}
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
              Vuoi davvero eliminare la regola{' '}
              <Text as="span" fontWeight="bold">{pendingDelete?.name}</Text>?
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              Questa azione non può essere annullata.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
