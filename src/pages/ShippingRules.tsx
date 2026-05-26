import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Button, Modal, Form, FormLayout, TextField, Select, Checkbox, InlineStack, BlockStack, Badge, Icon, Box } from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';
import { apiFetch } from '../utils/api';

interface ShippingRule {
  id: string;
  name: string;
  minItems: number;
  maxItems: number;
  secondaryPackagingId: string | null;
  fillerPackagingId: string | null;
  priority: number;
  isActive: boolean;
  secondaryPackaging?: { id: string; name: string };
  fillerPackaging?: { id: string; name: string };
}

export default function ShippingRules() {
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [inventory, setInventory] = useState<{label: string, value: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [minItems, setMinItems] = useState('1');
  const [maxItems, setMaxItems] = useState('5');
  const [secondaryPackagingId, setSecondaryPackagingId] = useState('none');
  const [fillerPackagingId, setFillerPackagingId] = useState('none');
  const [priority, setPriority] = useState('10');
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesData, invData] = await Promise.all([
        apiFetch('/orders/shipping-rules'),
        apiFetch('/packaging/inventory')
      ]);
      setRules(rulesData);
      setInventory(invData.map((i: any) => ({ label: i.customName, value: i.id })));
    } catch (e) {
      console.error("Failed to load rules", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = () => {
    const newRule: ShippingRule = {
      id: editingRuleId || Math.random().toString(),
      name,
      minItems: Number(minItems),
      maxItems: Number(maxItems),
      secondaryPackagingId: secondaryPackagingId === 'none' ? null : secondaryPackagingId,
      fillerPackagingId: fillerPackagingId === 'none' ? null : fillerPackagingId,
      priority: Number(priority),
      isActive
    };

    if (editingRuleId) {
      setRules(rules.map(r => r.id === editingRuleId ? newRule : r));
    } else {
      setRules([...rules, newRule]);
    }
    
    setModalOpen(false);
  };

  const handleEdit = (rule: ShippingRule) => {
    setName(rule.name);
    setMinItems(rule.minItems?.toString() || '1');
    setMaxItems(rule.maxItems?.toString() || '5');
    setSecondaryPackagingId(rule.secondaryPackagingId || 'none');
    setFillerPackagingId(rule.fillerPackagingId || 'none');
    setPriority(rule.priority?.toString() || '10');
    setIsActive(rule.isActive);
    setEditingRuleId(rule.id);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const resetForm = () => {
    setName('');
    setMinItems('1');
    setMaxItems('5');
    setSecondaryPackagingId('none');
    setFillerPackagingId('none');
    setPriority('10');
    setIsActive(true);
    setEditingRuleId(null);
  };

  const toggleActive = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <Page 
      title="Regole di Spedizione"
      primaryAction={{
        content: 'Nuova Regola',
        onAction: () => { resetForm(); setModalOpen(true); }
      }}
    >
      <Layout>
        <Layout.Section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {rules.map((item) => (
              <Card key={item.id} padding="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h3" variant="headingMd">{item.name}</Text>
                      <Badge tone={item.isActive ? "success" : "critical"}>{item.isActive ? "Attiva" : "Disattiva"}</Badge>
                      <Badge tone="info">Priorità: {item.priority}</Badge>
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      Da {item.minItems} a {item.maxItems} articoli per pacco.
                    </Text>
                    <InlineStack gap="400">
                      {item.secondaryPackagingId && (
                        <Text as="span" variant="bodySm"><b>Secondario:</b> {item.secondaryPackaging?.name || inventory.find(i => i.value === item.secondaryPackagingId)?.label || item.secondaryPackagingId}</Text>
                      )}
                      {item.fillerPackagingId && (
                        <Text as="span" variant="bodySm"><b>Riempimento:</b> {item.fillerPackaging?.name || inventory.find(i => i.value === item.fillerPackagingId)?.label || item.fillerPackagingId}</Text>
                      )}
                    </InlineStack>
                  </BlockStack>
                  <InlineStack gap="200">
                    <Button onClick={() => toggleActive(item.id)} tone={item.isActive ? "critical" : "success"}>
                      {item.isActive ? "Sospendi" : "Attiva"}
                    </Button>
                    <Button icon={EditIcon} onClick={() => handleEdit(item)}>Modifica</Button>
                    <Button tone="critical" icon={DeleteIcon} onClick={() => handleDelete(item.id)}>Elimina</Button>
                  </InlineStack>
                </InlineStack>
              </Card>
            ))}
            {rules.length === 0 && !loading && (
              <Card padding="400">
                <Text as="p" tone="subdued">Nessuna regola trovata. Creane una nuova.</Text>
              </Card>
            )}
          </div>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRuleId ? "Modifica Regola di Imballaggio" : "Nuova Regola di Imballaggio"}
        primaryAction={{ content: 'Salva', onAction: handleSubmit }}
        secondaryActions={[{ content: 'Annulla', onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <Form onSubmit={handleSubmit}>
            <FormLayout>
              <TextField label="Nome Regola" value={name} onChange={setName} autoComplete="off" />
              <FormLayout.Group>
                <TextField label="Articoli Minimi" type="number" value={minItems} onChange={setMinItems} autoComplete="off" />
                <TextField label="Articoli Massimi" type="number" value={maxItems} onChange={setMaxItems} autoComplete="off" />
              </FormLayout.Group>
              <Select label="Imballaggio Secondario (Opzionale)" options={[{label: 'Nessuno', value: 'none'}, ...inventory]} value={secondaryPackagingId} onChange={setSecondaryPackagingId} />
              <Select label="Imballaggio di Riempimento (Opzionale)" options={[{label: 'Nessuno', value: 'none'}, ...inventory]} value={fillerPackagingId} onChange={setFillerPackagingId} />
              <TextField label="Priorità (numero più alto = più importante)" type="number" value={priority} onChange={setPriority} autoComplete="off" helpText="Le regole con priorità più alta vengono valutate prima." />
              <Checkbox label="Regola Attiva" checked={isActive} onChange={setIsActive} />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
