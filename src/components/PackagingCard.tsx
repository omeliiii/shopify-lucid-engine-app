import { Card, Box, BlockStack, Text, InlineStack, Badge, Button } from '@shopify/polaris';
import { DeleteIcon, EditIcon, CheckIcon } from '@shopify/polaris-icons';

export type PackagingCategory = 'PRIMARY' | 'TAPE' | 'FILLER';

interface PackagingType {
  id: string;
  name: string;
  agnosticMaterial: string;
  category: PackagingCategory;
  imageUrl?: string;
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
  role: 'PRIMARY' | 'SECONDARY';
  isActive: boolean;
  packagingType: PackagingType;
  isAiSuggested: boolean;
  isConfirmed: boolean;
}

const CATEGORY_LABELS: Record<PackagingCategory, string> = {
  PRIMARY: 'Primario',
  TAPE: 'Tape',
  FILLER: 'Filler',
};

interface PackagingCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onAccept?: (item: InventoryItem) => void;
  isAiSuggested?: boolean;
}

export function PackagingCard({ item, onEdit, onDelete, onAccept, isAiSuggested }: PackagingCardProps) {
  const material = item.packagingType?.agnosticMaterial || 'PAPER';
  const imageUrl = item.packagingType?.imageUrl || '';
  const category = item.packagingType?.category || 'PRIMARY';
  const categoryTone: 'attention' | 'magic' | undefined =
    category === 'TAPE' ? 'attention' : category === 'FILLER' ? 'magic' : undefined;

  if (isAiSuggested) {
    return (
      <Card padding="0">
        <img
          src={imageUrl}
          alt={material}
          style={{ width: '100%', height: '90px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
        />
        <Box padding="200">
          <BlockStack gap="150">
            <Text as="h3" variant="headingXs" truncate>{item.name}</Text>
            <InlineStack gap="100" align="space-between">
              <InlineStack gap="100">
                <Badge tone={material === 'PAPER' ? 'success' : 'info'} size="small">{material}</Badge>
                {category !== 'PRIMARY' && (
                  <Badge tone={categoryTone} size="small">{CATEGORY_LABELS[category]}</Badge>
                )}
              </InlineStack>
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
        src={imageUrl}
        alt={material}
        style={{ width: '100%', height: '160px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
      />
      <Box padding="400">
        <BlockStack gap="200">
          <Text as="h3" variant="headingSm" truncate>{item.name}</Text>
          <InlineStack gap="200" align="space-between">
            <InlineStack gap="100">
              <Badge tone={material === 'PAPER' ? 'success' : 'info'}>{material}</Badge>
              {category !== 'PRIMARY' && (
                <Badge tone={categoryTone}>{CATEGORY_LABELS[category]}</Badge>
              )}
            </InlineStack>
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
