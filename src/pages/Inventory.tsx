import { Page, Layout, Card, Text } from '@shopify/polaris';

export default function Inventory() {
  return (
    <Page title="Inventario Imballaggi">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Inventario</Text>
            <Text as="p" variant="bodyMd">Gestisci il tuo catalogo di imballaggi.</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
