import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBilling } from '../contexts/BillingProvider';

/**
 * Reads `?billing-status` from the URL after Shopify redirects back.
 *
 * - `ACTIVE`  → toast + refresh subscription
 * - `PENDING` / `unknown` → poll every 2 s for max 10 s
 *
 * Must be rendered inside `<BillingProvider>`.
 */
export function BillingReturnHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshSubscription } = useBilling();
  const { t } = useTranslation('common');
  const handled = useRef(false);

  useEffect(() => {
    const billingStatus = searchParams.get('billing-status');
    if (!billingStatus || handled.current) return;
    handled.current = true;

    // Remove the param from the URL immediately
    const next = new URLSearchParams(searchParams);
    next.delete('billing-status');
    setSearchParams(next, { replace: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shopify = (window as any).shopify;
    const showToast = (msg: string, opts?: { isError?: boolean }) => {
      if (shopify?.toast) {
        shopify.toast.show(msg, opts);
      } else {
        // eslint-disable-next-line no-alert
        alert(msg);
      }
    };

    if (billingStatus === 'ACTIVE') {
      showToast(t('paywall.subscription_activated'));
      refreshSubscription();
      return;
    }

    // PENDING or unknown → poll
    showToast(t('paywall.subscription_verifying'));

    let attempts = 0;
    const MAX_ATTEMPTS = 5; // 5 × 2 s = 10 s
    const timer = setInterval(async () => {
      attempts++;
      try {
        // We re-import fetchSubscription to get raw data without context
        const { fetchSubscription: poll } = await import('../utils/billingApi');
        const sub = await poll();

        if (sub.status === 'ACTIVE') {
          clearInterval(timer);
          showToast(t('paywall.subscription_activated'));
          refreshSubscription();
          return;
        }
      } catch {
        // keep polling
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
        showToast(t('paywall.subscription_processing'));
        refreshSubscription();
      }
    }, 2000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // render-less component
}
