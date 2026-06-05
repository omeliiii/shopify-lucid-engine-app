import { useEffect, useState } from 'react';
import { Frame, Navigation } from '@shopify/polaris';
import { HomeIcon, InventoryIcon, ProductIcon, SettingsIcon, FileIcon, CreditCardIcon, CollectionIcon } from '@shopify/polaris-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../utils/api';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const [unreadReports, setUnreadReports] = useState<number>(0);

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

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            url: '/',
            label: t('navigation.dashboard'),
            icon: HomeIcon,
            onClick: () => navigate('/'),
            selected: location.pathname === '/',
          },
          {
            url: '/inventory',
            label: t('navigation.inventory'),
            icon: InventoryIcon,
            onClick: () => navigate('/inventory'),
            selected: location.pathname === '/inventory',
          },
          {
            url: '/mapping',
            label: t('navigation.mapping'),
            icon: ProductIcon,
            onClick: () => navigate('/mapping'),
            selected: location.pathname === '/mapping',
          },
          {
            url: '/groups',
            label: t('navigation.groups'),
            icon: CollectionIcon,
            onClick: () => navigate('/groups'),
            selected: location.pathname === '/groups',
          },
          {
            url: '/shipping-rules',
            label: t('navigation.shipping_rules'),
            icon: SettingsIcon,
            onClick: () => navigate('/shipping-rules'),
            selected: location.pathname === '/shipping-rules',
          },
          {
            url: '/reports',
            label: t('navigation.reports'),
            icon: FileIcon,
            badge: unreadReports > 0 ? String(unreadReports) : undefined,
            onClick: () => {
              navigate('/reports');
              setUnreadReports(0);
            },
            selected: location.pathname === '/reports',
          },
          {
            url: '/subscription',
            label: t('navigation.subscription'),
            icon: CreditCardIcon,
            onClick: () => navigate('/subscription'),
            selected: location.pathname === '/subscription',
          },
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
