export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // In a real Shopify embedded app, we would get the Session Token from App Bridge.
  // For local development, we use X-Merchant-Id: 100 as requested.
  const headers = new Headers(options.headers || {});
  headers.append('X-Merchant-Id', '100');
  headers.append('Content-Type', 'application/json');

  const response = await fetch(`http://localhost:3000${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
