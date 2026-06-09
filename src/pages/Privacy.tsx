import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Box,
  Icon,
} from '@shopify/polaris';
import { CheckCircleIcon, InfoIcon } from '@shopify/polaris-icons';
import { useTranslation, Trans } from 'react-i18next';

type ItemStatus = 'compliant' | 'na';

// Maps each compliance section to the items rendered inside it. Full i18n keys
// are spelled out as literals so they stay type-checked against the `privacy`
// namespace.
const SECTIONS = [
  {
    titleKey: 'sections.data_purpose.title',
    items: [
      { qKey: 'sections.data_purpose.items.what.q', aKey: 'sections.data_purpose.items.what.a', status: 'compliant' },
      { qKey: 'sections.data_purpose.items.purpose_limit.q', aKey: 'sections.data_purpose.items.purpose_limit.a', status: 'compliant' },
    ],
  },
  {
    titleKey: 'sections.agreements.title',
    items: [
      { qKey: 'sections.agreements.items.dpa.q', aKey: 'sections.agreements.items.dpa.a', status: 'compliant' },
    ],
  },
  {
    titleKey: 'sections.consent.title',
    items: [
      { qKey: 'sections.consent.items.consent.q', aKey: 'sections.consent.items.consent.a', status: 'compliant' },
      { qKey: 'sections.consent.items.opt_out_sale.q', aKey: 'sections.consent.items.opt_out_sale.a', status: 'compliant' },
      { qKey: 'sections.consent.items.automated.q', aKey: 'sections.consent.items.automated.a', status: 'na' },
    ],
  },
  {
    titleKey: 'sections.retention.title',
    items: [
      { qKey: 'sections.retention.items.retention.q', aKey: 'sections.retention.items.retention.a', status: 'compliant' },
    ],
  },
  {
    titleKey: 'sections.security.title',
    items: [
      { qKey: 'sections.security.items.encryption.q', aKey: 'sections.security.items.encryption.a', status: 'compliant' },
      { qKey: 'sections.security.items.backups.q', aKey: 'sections.security.items.backups.a', status: 'compliant' },
      { qKey: 'sections.security.items.test_prod.q', aKey: 'sections.security.items.test_prod.a', status: 'compliant' },
      { qKey: 'sections.security.items.dlp.q', aKey: 'sections.security.items.dlp.a', status: 'compliant' },
      { qKey: 'sections.security.items.access_log.q', aKey: 'sections.security.items.access_log.a', status: 'compliant' },
      { qKey: 'sections.security.items.incident.q', aKey: 'sections.security.items.incident.a', status: 'compliant' },
    ],
  },
] as const;

export default function Privacy() {
  const { t } = useTranslation('privacy');
  const email = t('contact.email');

  const renderStatus = (status: ItemStatus) =>
    status === 'compliant' ? (
      <Badge tone="success" icon={CheckCircleIcon}>
        {t('status.compliant')}
      </Badge>
    ) : (
      <Badge icon={InfoIcon}>{t('status.not_applicable')}</Badge>
    );

  return (
    <Page title={t('title')} subtitle={t('subtitle')} narrowWidth>
      <Layout>
        {/* ── Intro ── */}
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="p">{t('intro')}</Text>
              <Text as="p" tone="subdued" variant="bodySm">
                {t('last_updated_label')}: {t('last_updated')}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* ── Compliance sections ── */}
        {SECTIONS.map((section) => (
          <Layout.Section key={section.titleKey}>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  {t(section.titleKey)}
                </Text>
                <BlockStack gap="500">
                  {section.items.map((item) => (
                    <InlineStack key={item.qKey} gap="300" wrap={false} blockAlign="start">
                      <Box minWidth="116px">{renderStatus(item.status)}</Box>
                      <BlockStack gap="100">
                        <Text as="h3" variant="headingSm">
                          {t(item.qKey)}
                        </Text>
                        <Text as="p" tone="subdued">
                          {t(item.aKey)}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        ))}

        {/* ── Contact ── */}
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={InfoIcon} tone="subdued" />
                <Text as="h2" variant="headingSm">
                  {t('contact.title')}
                </Text>
              </InlineStack>
              <Text as="p" tone="subdued">
                <Trans
                  ns="privacy"
                  i18nKey="contact.body"
                  values={{ email }}
                  components={{ a: <a href={`mailto:${email}`} /> }}
                />
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
