import { useCallback, useMemo } from 'react';

// Thin wrapper around App Bridge v4's `shopify.toast`.
//
// In dev (outside the embedded admin) we log to the console so signals don't
// silently disappear.

type ToastOpts = { isError?: boolean };

interface ShopifyGlobal {
  toast?: {
    show: (message: string, opts?: ToastOpts) => void;
  };
}

function getShopifyToast(): ShopifyGlobal['toast'] | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shopify = (window as any).shopify as ShopifyGlobal | undefined;
  return shopify?.toast;
}

export function useToast() {
  const show = useCallback((message: string, opts?: ToastOpts) => {
    const t = getShopifyToast();
    if (t) {
      t.show(message, opts);
    } else if (opts?.isError) {
      console.error('[toast]', message);
    } else {
      console.info('[toast]', message);
    }
  }, []);

  return useMemo(
    () => ({
      success: (message: string) => show(message),
      error: (message: string) => show(message, { isError: true }),
      show,
    }),
    [show],
  );
}
