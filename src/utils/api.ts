import { MOCKS } from './mocks';
import type { BillingError } from '../types/billingTypes';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns a Shopify session token (JWT) via App Bridge v4, or null in dev. */
async function getSessionToken(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shopify = (window as any).shopify;
    if (shopify?.idToken) {
      return await shopify.idToken();
    }
  } catch {
    console.warn('[API] Could not obtain session token — running outside Shopify?');
  }
  return null;
}

/** Returns true when the error body matches the backend's BillingError shape. */
export function isBillingError(err: unknown): err is BillingError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    'error' in err &&
    'message' in err
  );
}

// ── apiFetch ───────────────────────────────────────────────────────────────────

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

  const baseEndpoint = endpoint.split('?')[0];
  const isGet = !options.method || options.method === 'GET';

  if (useMocks) {
    console.log(`[MOCK] ${options.method || 'GET'} ${endpoint}`);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (isGet && MOCKS[baseEndpoint]) {
      return MOCKS[baseEndpoint];
    } else if (!isGet) {
      // For mutations, return success
      return { success: true };
    }
    throw new Error(`Mock non trovato per ${endpoint}`);
  }

  // Real fetch
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  // Attach Bearer token when running inside Shopify admin
  const token = await getSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    // Fallback for local development outside App Bridge
    headers.set('X-Merchant-Id', '100');
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to parse a structured error body from the backend
    let errorBody: BillingError | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // body is not JSON — fall through
    }

    if (errorBody && isBillingError(errorBody)) {
      throw errorBody;
    }

    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  // 204 No Content (e.g. POST /billing/cancel)
  if (response.status === 204) {
    return undefined;
  }

  return await response.json();
}

// ── apiDownload ────────────────────────────────────────────────────────────────

export async function apiDownload(endpoint: string, fallbackFilename: string) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

  if (useMocks) {
    console.log(`[MOCK DOWNLOAD] GET ${endpoint}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    const content = `MOCK FILE CONTENT\nEndpoint: ${endpoint}\nTimestamp: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    triggerDownload(blob, fallbackFilename);
    return;
  }

  const headers = new Headers();
  const token = await getSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    // Fallback for local development outside App Bridge
    headers.set('X-Merchant-Id', import.meta.env.VITE_DEV_MERCHANT_ID || 'lucid-test-merchant.myshopify.com');
  }

  const response = await fetch(`${apiUrl}${endpoint}`, { headers });

  if (!response.ok) {
    // Try to parse structured billing error (e.g. 402 on locked download)
    let errorBody: BillingError | null = null;
    try {
      const cloned = response.clone();
      errorBody = await cloned.json();
    } catch {
      // not JSON
    }

    if (errorBody && isBillingError(errorBody)) {
      throw errorBody;
    }

    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  let filename = fallbackFilename;
  const contentDisposition = response.headers.get('content-disposition');
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  triggerDownload(blob, filename);
}

// ── triggerDownload ────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
