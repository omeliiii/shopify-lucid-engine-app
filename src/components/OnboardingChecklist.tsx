import {
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Icon,
  ProgressBar,
  Spinner,
} from '@shopify/polaris';
import { CheckCircleIcon, CircleChevronRightIcon } from '@shopify/polaris-icons';
import { useTranslation } from 'react-i18next';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  /** Disable the CTA until prerequisites are satisfied. */
  disabled?: boolean;
  ctaLabel: string;
  onAction: () => void;
  /** Optional in-progress indicator (e.g. backfill running). */
  inProgress?: boolean;
  /** Optional sub-content rendered under the row (progress bar, banner, …). */
  extra?: React.ReactNode;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  title?: string;
}

export function OnboardingChecklist({ steps, title }: OnboardingChecklistProps) {
  const { t } = useTranslation('common');
  const resolvedTitle = title ?? t('onboarding.checklist_title');
  const completed = steps.filter((s) => s.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div data-tour="checklist">
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">{resolvedTitle}</Text>
              <Text as="span" tone="subdued" variant="bodySm">
                {t('onboarding.progress', { completed, total: steps.length })}
              </Text>
            </InlineStack>
            <ProgressBar progress={progress} size="small" tone="primary" />
          </BlockStack>

          <BlockStack gap="0">
            {steps.map((step, idx) => (
              <div key={step.id} data-tour={`checklist-item-${step.id}`}>
              <Box
                paddingBlockStart={idx === 0 ? '0' : '300'}
                paddingBlockEnd="300"
                borderBlockStartWidth={idx === 0 ? '0' : '025'}
                borderColor="border"
              >
              <InlineStack align="space-between" blockAlign="center" wrap={false} gap="400">
                <InlineStack gap="300" blockAlign="center" wrap={false}>
                  <Box>
                    {step.done ? (
                      <Icon source={CheckCircleIcon} tone="success" />
                    ) : step.inProgress ? (
                      <Spinner size="small" accessibilityLabel={t('states.in_progress')} />
                    ) : (
                      <Icon source={CircleChevronRightIcon} tone={step.disabled ? 'subdued' : 'base'} />
                    )}
                  </Box>
                  <BlockStack gap="050">
                    <Text
                      as="span"
                      variant="bodyMd"
                      fontWeight="semibold"
                      tone={step.disabled && !step.done ? 'subdued' : undefined}
                    >
                      {idx + 1}. {step.title}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {step.description}
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Box>
                  <Button
                    variant={step.done ? 'tertiary' : 'primary'}
                    disabled={step.disabled || step.inProgress}
                    onClick={step.onAction}
                  >
                    {step.inProgress ? t('onboarding.step_in_progress') : step.done ? t('onboarding.step_review') : step.ctaLabel}
                  </Button>
                </Box>
              </InlineStack>
              {step.extra && <Box paddingBlockStart="200">{step.extra}</Box>}
              </Box>
              </div>
            ))}
          </BlockStack>
        </BlockStack>
      </Card>
    </div>
  );
}
