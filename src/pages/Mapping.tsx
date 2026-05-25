import { Page, Layout, Card, Text } from '@shopify/polaris';

export default function Mapping() {
  return (
    <Page title="Mappatura Prodotti">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Mappatura</Text>
            <Text as="p" variant="bodyMd">Associa i prodotti del tuo catalogo agli imballaggi.</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
