import { MOCKS } from './mocks';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // In Vite, env variables are available under import.meta.env
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

  const baseEndpoint = endpoint.split('?')[0];
  const isGet = !options.method || options.method === 'GET';

  if (useMocks) {
    console.log(`[MOCK] ${options.method || 'GET'} ${endpoint}`);
    // Simulate network delay
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
  headers.append('X-Merchant-Id', '100');
  headers.append('Content-Type', 'application/json');

  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Fallback if real server is down but useMocks is false (optional, kept for resilience)
    console.warn(`[API] Failed to fetch ${endpoint}, falling back to centralized mock data.`, error);
    if (isGet && MOCKS[baseEndpoint]) {
      return MOCKS[baseEndpoint];
    } else if (!isGet) {
      return { success: true };
    }
    throw error;
  }
}
