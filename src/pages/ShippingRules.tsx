import { Page, Layout, Card, Text } from '@shopify/polaris';

export default function ShippingRules() {
  return (
    <Page title="Regole di Spedizione">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Regole</Text>
            <Text as="p" variant="bodyMd">Configura le regole di imballaggio per ordini multipli.</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
