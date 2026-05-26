import { Card, Box, BlockStack, Text, InlineStack, Badge, Button } from '@shopify/polaris';
import { DeleteIcon, EditIcon, CheckIcon } from '@shopify/polaris-icons';

interface PackagingType {
  id: string;
  name: string;
  agnosticMaterial: string;
}

export interface InventoryItem {
  id: string;
  packagingTypeId: string;
  name: string;
  lMm: number | null;
  wMm: number | null;
  hMm: number | null;
  customGsm: number | null;
  calculatedUnitWeightGrams: number;
  role: 'PRIMARY' | 'SECONDARY' | 'FILLER';
  isActive: boolean;
  packagingType: PackagingType;
  isAiSuggested: boolean;
  isConfirmed: boolean;
}

interface PackagingCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onAccept?: (item: InventoryItem) => void;
  isAiSuggested?: boolean;
}

const getMaterialImage = (material: string) => {
  switch (material) {
    case 'PAPER': return 'https://images.unsplash.com/photo-1589758438368-0c313dc12574?auto=format&fit=crop&q=80&w=200&h=200';
    case 'PLASTIC': return 'https://images.unsplash.com/photo-1628148818167-27e1f4404fbe?auto=format&fit=crop&q=80&w=200&h=200';
    case 'COMPOSITE': return 'https://images.unsplash.com/photo-1563241527-2004fb0f49c0?auto=format&fit=crop&q=80&w=200&h=200';
    default: return 'https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png';
  }
};

export function PackagingCard({ item, onEdit, onDelete, onAccept, isAiSuggested }: PackagingCardProps) {
  const material = item.packagingType?.agnosticMaterial || 'PAPER';

  if (isAiSuggested) {
    return (
      <Card padding="0">
        <img
          src={getMaterialImage(material)}
          alt={material}
          style={{ width: '100%', height: '90px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
        />
        <Box padding="200">
          <BlockStack gap="150">
            <Text as="h3" variant="headingXs" truncate>{item.name}</Text>
            <InlineStack gap="100" align="space-between">
              <Badge tone={material === 'PAPER' ? 'success' : 'info'} size="small">{material}</Badge>
              <Text as="span" tone="subdued" variant="bodySm">{item.calculatedUnitWeightGrams}g</Text>
            </InlineStack>
            {(item.lMm || item.wMm || item.hMm) && (
              <Text as="span" tone="subdued" variant="bodySm">
                {item.lMm || 0}×{item.wMm || 0}×{item.hMm || 0} mm
              </Text>
            )}
            <InlineStack gap="100" align="start" wrap={false}>
              <Button size="micro" tone="success" icon={CheckIcon} onClick={() => onAccept?.(item)}>Accetta</Button>
              <Button size="micro" icon={EditIcon} onClick={() => onEdit(item)}>Modifica</Button>
              <Button size="micro" tone="critical" onClick={() => onDelete(item.id)}>Rifiuta</Button>
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>
    );
  }

  return (
    <Card padding="0">
      <img
        src={getMaterialImage(material)}
        alt={material}
        style={{ width: '100%', height: '160px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
      />
      <Box padding="400">
        <BlockStack gap="200">
          <Text as="h3" variant="headingSm" truncate>{item.name}</Text>
          <InlineStack gap="200" align="space-between">
            <Badge tone={material === 'PAPER' ? 'success' : 'info'}>{material}</Badge>
            <Text as="span" tone="subdued" variant="bodySm">{item.calculatedUnitWeightGrams}g</Text>
          </InlineStack>
          <Text as="span" tone="subdued" variant="bodySm">
            {item.lMm || 0}×{item.wMm || 0}×{item.hMm || 0} mm
          </Text>
          {item.customGsm && (
            <Text as="span" tone="subdued" variant="bodySm">
              Grammatura: {item.customGsm} g/m²
            </Text>
          )}
          <div style={{ paddingTop: '8px' }}>
            <InlineStack gap="200" align="space-between">
              <Button size="micro" tone="critical" icon={DeleteIcon} onClick={() => onDelete(item.id)}>Elimina</Button>
              <Button size="micro" icon={EditIcon} onClick={() => onEdit(item)}>Modifica</Button>
            </InlineStack>
          </div>
        </BlockStack>
      </Box>
    </Card>
  );
}
