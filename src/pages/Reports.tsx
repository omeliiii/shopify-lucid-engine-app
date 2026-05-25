import { Page, Layout, Card, Text } from '@shopify/polaris';

export default function Reports() {
  return (
    <Page title="Report e Dichiarazioni">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Report</Text>
            <Text as="p" variant="bodyMd">Genera e scarica le dichiarazioni LUCID, CONAI o CITEO.</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
