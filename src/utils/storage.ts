// Shop-scoped localStorage helpers.
//
// App Bridge v4 exposes the current shop on `window.shopify.config.shop`.
// Outside Shopify (local dev) we fall back to a constant marker so devs
// don't accidentally pick up state from a previous embedded session.

function getShop(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shopify = (window as any).shopify;
  return shopify?.config?.shop ?? 'dev';
}

export function shopKey(suffix: string): string {
  return `${suffix}::${getShop()}`;
}
