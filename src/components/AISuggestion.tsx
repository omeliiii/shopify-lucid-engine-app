import {
  Box,
  BlockStack,
  InlineStack,
  Text,
  Icon,
  Badge,
  Button,
  Thumbnail,
} from '@shopify/polaris';
import { MagicIcon } from '@shopify/polaris-icons';

// ── <AISuggestion.Section> ───────────────────────────────────────────────────
// Highlighted container that groups one or more AI-generated suggestions.
// Use for "showcase" patterns like the suggested-packaging grid in Inventory.

interface SectionProps {
  /** Section title. Defaults to "Suggeriti dall'IA". */
  title?: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Optional count badge shown next to the title. */
  count?: number;
  children: React.ReactNode;
}

function AISuggestionSection({
  title = "Suggeriti dall'IA",
  subtitle,
  count,
  children,
}: SectionProps) {
  return (
    <Box
      background="bg-surface-magic"
      padding="400"
      borderRadius="200"
      borderColor="border-magic"
      borderWidth="025"
    >
      <BlockStack gap="400">
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={MagicIcon} tone="magic" />
            <Text as="h3" variant="headingMd" tone="magic">{title}</Text>
            {typeof count === 'number' && count > 0 && (
              <Badge tone="magic">{String(count)}</Badge>
            )}
          </InlineStack>
          {subtitle && (
            <Text as="p" variant="bodySm" tone="subdued">{subtitle}</Text>
          )}
        </BlockStack>
        {children}
      </BlockStack>
    </Box>
  );
}

// ── <AISuggestion.Item> ──────────────────────────────────────────────────────
// Single inline AI suggestion card with confidence + reason + accept/reject.
// Use for per-row inline patterns like the pending mappings in Mapping.

interface ItemProps {
  thumbnailUrl?: string;
  title: string;
  /** 0..1 confidence score; rendered as a percentage badge if provided. */
  confidence?: number;
  /** Short rationale shown under the title. */
  reason?: string;
  onAccept: () => void;
  onReject: () => void;
  acceptLabel?: string;
  rejectLabel?: string;
  /** Disable both actions while a sibling mutation is in-flight. */
  disabled?: boolean;
}

function AISuggestionItem({
  thumbnailUrl,
  title,
  confidence,
  reason,
  onAccept,
  onReject,
  acceptLabel = 'Accetta',
  rejectLabel = 'Rifiuta',
  disabled = false,
}: ItemProps) {
  return (
    <Box
      background="bg-surface-magic"
      padding="300"
      borderRadius="200"
      borderWidth="025"
      borderColor="border-magic"
    >
      <BlockStack gap="200">
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <Icon source={MagicIcon} tone="magic" />
          {thumbnailUrl && (
            <Thumbnail source={thumbnailUrl} alt={title} size="extraSmall" />
          )}
          <Text as="span" fontWeight="semibold">{title}</Text>
          {typeof confidence === 'number' && (
            <Badge tone="magic">{`${Math.round(confidence * 100)}%`}</Badge>
          )}
        </InlineStack>
        {reason && (
          <Text as="p" variant="bodySm" tone="subdued">{reason}</Text>
        )}
        <InlineStack gap="200">
          <Button size="micro" variant="primary" disabled={disabled} onClick={onAccept}>
            {acceptLabel}
          </Button>
          <Button size="micro" tone="critical" disabled={disabled} onClick={onReject}>
            {rejectLabel}
          </Button>
        </InlineStack>
      </BlockStack>
    </Box>
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

export const AISuggestion = {
  Section: AISuggestionSection,
  Item: AISuggestionItem,
};
