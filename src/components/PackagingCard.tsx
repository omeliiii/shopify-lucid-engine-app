import { Card, Box, BlockStack, Text, InlineStack, Badge, Button } from '@shopify/polaris';
import { DeleteIcon, EditIcon, CheckIcon } from '@shopify/polaris-icons';
import { useTranslation } from 'react-i18next';

export type PackagingCategory = 'PRIMARY' | 'TAPE' | 'FILLER';

interface PackagingType {
  id: string;
  name: string;
  agnosticMaterial: string;
  category: PackagingCategory;
  imageUrl?: string;
  formulaType?: string;
}

export interface InventoryItem {
  id: string;
  packagingTypeId: string;
  name: string;
  lMm: number | null;
  wMm: number | null;
  hMm: number | null;
  customGsm: number | null;
  customStaticWeightG: number | null;
  calculatedUnitWeightGrams: number;
  role: 'PRIMARY' | 'SECONDARY';
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

export function PackagingCard({ item, onEdit, onDelete, onAccept, isAiSuggested }: PackagingCardProps) {
  const { t } = useTranslation('common');
  const material = item.packagingType?.agnosticMaterial || 'PAPER';
  const imageUrl = item.packagingType?.imageUrl || '';
  const category = item.packagingType?.category || 'PRIMARY';
  const categoryTone: 'attention' | 'magic' | undefined =
    category === 'TAPE' ? 'attention' : category === 'FILLER' ? 'magic' : undefined;

  const materialLabel = t(`materials.${material}` as 'materials.PAPER');
  const categoryLabel = t(`categories.${category}` as 'categories.PRIMARY');

  if (isAiSuggested) {
    return (
      <Card padding="0">
        <img
          src={imageUrl}
          alt={materialLabel}
          style={{ width: '100%', height: '90px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
        />
        <Box padding="200">
          <BlockStack gap="150">
            <Text as="h3" variant="headingXs" truncate>{item.name}</Text>
            <InlineStack gap="100" align="space-between">
              <InlineStack gap="100">
                <Badge tone={material === 'PAPER' ? 'success' : 'info'} size="small">{materialLabel}</Badge>
                {category !== 'PRIMARY' && (
                  <Badge tone={categoryTone} size="small">{categoryLabel}</Badge>
                )}
              </InlineStack>
              <Text as="span" tone="subdued" variant="bodySm">{t('units.weight_g', { value: Number(item.calculatedUnitWeightGrams.toFixed(2)) })}</Text>
            </InlineStack>
            {(item.lMm || item.wMm || item.hMm) && (
              <Text as="span" tone="subdued" variant="bodySm">
                {t('units.dimensions_lwh', { l: item.lMm || 0, w: item.wMm || 0, h: item.hMm || 0 })}
              </Text>
            )}
            <InlineStack gap="100" align="start" wrap={false}>
              <Button size="micro" tone="success" icon={CheckIcon} onClick={() => onAccept?.(item)}>{t('actions.accept')}</Button>
              <Button size="micro" icon={EditIcon} onClick={() => onEdit(item)}>{t('actions.edit')}</Button>
              <Button size="micro" tone="critical" onClick={() => onDelete(item.id)}>{t('actions.reject')}</Button>
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
        alt={materialLabel}
        style={{ width: '100%', height: '160px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
      />
      <Box padding="400">
        <BlockStack gap="200">
          <Text as="h3" variant="headingSm" truncate>{item.name}</Text>
          <InlineStack gap="200" align="space-between">
            <InlineStack gap="100">
              <Badge tone={material === 'PAPER' ? 'success' : 'info'}>{materialLabel}</Badge>
              {category !== 'PRIMARY' && (
                <Badge tone={categoryTone}>{categoryLabel}</Badge>
              )}
            </InlineStack>
            <Text as="span" tone="subdued" variant="bodySm">{t('units.weight_g', { value: Number(item.calculatedUnitWeightGrams.toFixed(2)) })}</Text>
          </InlineStack>
          <Text as="span" tone="subdued" variant="bodySm">
            {t('units.dimensions_lwh', { l: item.lMm || 0, w: item.wMm || 0, h: item.hMm || 0 })}
          </Text>
          {item.packagingType?.formulaType === 'STATIC' ? (
            item.customStaticWeightG != null && (
              <Text as="span" tone="subdued" variant="bodySm">
                {t('units.weight_g', { value: item.customStaticWeightG })}
              </Text>
            )
          ) : (
            item.customGsm != null && (
              <Text as="span" tone="subdued" variant="bodySm">
                {t('units.gsm_label')}: {t('units.gsm', { value: item.customGsm })}
              </Text>
            )
          )}
          <div style={{ paddingTop: '8px' }}>
            <InlineStack gap="200" align="space-between">
              <Button size="micro" tone="critical" icon={DeleteIcon} onClick={() => onDelete(item.id)}>{t('actions.delete')}</Button>
              <Button size="micro" icon={EditIcon} onClick={() => onEdit(item)}>{t('actions.edit')}</Button>
            </InlineStack>
          </div>
        </BlockStack>
      </Box>
    </Card>
  );
}
