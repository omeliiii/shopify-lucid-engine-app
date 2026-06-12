import { useCallback, useEffect, useState } from 'react';
import { Frame, Navigation, TopBar } from '@shopify/polaris';
import { HomeIcon, InventoryIcon, ProductIcon, SettingsIcon, FileIcon, DeliveryIcon, CollectionIcon } from '@shopify/polaris-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../utils/api';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const [unreadReports, setUnreadReports] = useState<number>(0);

  // Mobile navigation: Polaris hides the sidebar on small screens behind a
  // TopBar hamburger toggle. Without it the nav is unreachable on mobile.
  const [mobileNavActive, setMobileNavActive] = useState(false);
  const toggleMobileNav = useCallback(() => setMobileNavActive((active) => !active), []);

  // Navigate and close the mobile nav overlay so it doesn't linger after
  // tapping a destination.
  const handleNavigate = useCallback(
    (path: string) => {
      setMobileNavActive(false);
      navigate(path);
    },
    [navigate],
  );

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
            onClick: () => handleNavigate('/'),
            selected: location.pathname === '/',
          },
          {
            url: '/inventory',
            label: t('navigation.inventory'),
            icon: InventoryIcon,
            onClick: () => handleNavigate('/inventory'),
            selected: location.pathname === '/inventory',
          },
          {
            url: '/mapping',
            label: t('navigation.mapping'),
            icon: ProductIcon,
            onClick: () => handleNavigate('/mapping'),
            selected: location.pathname === '/mapping',
          },
          {
            url: '/groups',
            label: t('navigation.groups'),
            icon: CollectionIcon,
            onClick: () => handleNavigate('/groups'),
            selected: location.pathname === '/groups',
          },
          {
            url: '/shipping-rules',
            label: t('navigation.shipping_rules'),
            icon: DeliveryIcon,
            onClick: () => handleNavigate('/shipping-rules'),
            selected: location.pathname === '/shipping-rules',
          },
          {
            url: '/reports',
            label: t('navigation.reports'),
            icon: FileIcon,
            badge: unreadReports > 0 ? String(unreadReports) : undefined,
            onClick: () => {
              handleNavigate('/reports');
              setUnreadReports(0);
            },
            selected: location.pathname === '/reports',
          },
          {
            url: '/settings',
            label: t('navigation.settings'),
            icon: SettingsIcon,
            onClick: () => handleNavigate('/settings'),
            selected: location.pathname === '/settings',
          },
        ]}
      />
    </Navigation>
  );

  const topBarMarkup = (
    <TopBar showNavigationToggle onNavigationToggle={toggleMobileNav} />
  );

  return (
    <Frame
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavActive}
      onNavigationDismiss={toggleMobileNav}
    >
      <div style={{ paddingBottom: 'var(--p-space-800)' }}>
        {children}
      </div>
    </Frame>
  );
}
