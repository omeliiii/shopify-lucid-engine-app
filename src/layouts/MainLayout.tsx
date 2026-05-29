import { useEffect, useState } from 'react';
import { Frame, Navigation } from '@shopify/polaris';
import { HomeIcon, InventoryIcon, ProductIcon, SettingsIcon, FileIcon, CreditCardIcon, CollectionIcon } from '@shopify/polaris-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useBilling } from '../contexts/BillingProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadReports, setUnreadReports] = useState<number>(0);
  const { subscription } = useBilling();

  // One-shot fetch at app load — no polling.
  useEffect(() => {
    let cancelled = false;
    apiFetch('/notifications/unread-count')
      .then((res: { count: number } | number | undefined) => {
        if (cancelled) return;
        const count = typeof res === 'number' ? res : res?.count ?? 0;
        setUnreadReports(count);
      })
      .catch((e) => console.warn('[MainLayout] unread-count fetch failed', e));
    return () => {
      cancelled = true;
    };
  }, []);

  // Show subscription nav item only when there's an active subscription
  const showSubscriptionNav = subscription?.hasSubscription === true;

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            url: '/',
            label: 'Dashboard & Logs',
            icon: HomeIcon,
            onClick: () => navigate('/'),
            selected: location.pathname === '/',
          },
          {
            url: '/inventory',
            label: 'Inventario Imballaggi',
            icon: InventoryIcon,
            onClick: () => navigate('/inventory'),
            selected: location.pathname === '/inventory',
          },
          {
            url: '/mapping',
            label: 'Mappatura Prodotti',
            icon: ProductIcon,
            onClick: () => navigate('/mapping'),
            selected: location.pathname === '/mapping',
          },
          {
            url: '/groups',
            label: 'Gruppi Prodotto',
            icon: CollectionIcon,
            onClick: () => navigate('/groups'),
            selected: location.pathname === '/groups',
          },
          {
            url: '/shipping-rules',
            label: 'Regole di Spedizione',
            icon: SettingsIcon,
            onClick: () => navigate('/shipping-rules'),
            selected: location.pathname === '/shipping-rules',
          },
          {
            url: '/reports',
            label: 'Report e Dichiarazioni',
            icon: FileIcon,
            badge: unreadReports > 0 ? String(unreadReports) : undefined,
            onClick: () => {
              navigate('/reports');
              setUnreadReports(0);
            },
            selected: location.pathname === '/reports',
          },
          ...(showSubscriptionNav
            ? [
                {
                  url: '/subscription',
                  label: 'Subscription',
                  icon: CreditCardIcon,
                  onClick: () => navigate('/subscription'),
                  selected: location.pathname === '/subscription',
                },
              ]
            : []),
        ]}
      />
    </Navigation>
  );

  return (
    <Frame navigation={navigationMarkup}>
      {children}
    </Frame>
  );
}
