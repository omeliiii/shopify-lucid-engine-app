import { Frame, Navigation } from '@shopify/polaris';
import { HomeIcon, InventoryIcon, ProductIcon, SettingsIcon, FileIcon } from '@shopify/polaris-icons';
import { useLocation, useNavigate } from 'react-router-dom';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

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
            onClick: () => navigate('/reports'),
            selected: location.pathname === '/reports',
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
