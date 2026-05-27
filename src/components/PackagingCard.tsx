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

export const getMaterialImage = (material?: string) => {
  switch (material) {
    case 'PAPER': return 'https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png';
    case 'PLASTIC': return 'https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png';
    case 'COMPOSITE': return 'https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png';
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
              <Text as="span" tone="subdued" variant="bodySm">{Number(item.calculatedUnitWeightGrams.toFixed(2))}g</Text>
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
            <Text as="span" tone="subdued" variant="bodySm">{Number(item.calculatedUnitWeightGrams.toFixed(2))}g</Text>
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
