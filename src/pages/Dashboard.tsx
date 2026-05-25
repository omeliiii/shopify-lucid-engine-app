import { Page, Layout, Card, Text } from '@shopify/polaris';

export default function Dashboard() {
  return (
    <Page title="Dashboard & Logs">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Benvenuto in Shopify Lucid Engine</Text>
            <Text as="p" variant="bodyMd">Qui potrai visualizzare le statistiche e i log delle spedizioni.</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
