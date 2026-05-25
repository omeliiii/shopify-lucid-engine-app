import { Frame, Navigation } from '@shopify/polaris';
import { HomeMinor, InventoryMajor, ProductsMajor, SettingsMajor, ReportMinor } from '@shopify/polaris-icons';
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
            icon: HomeMinor,
            onClick: () => navigate('/'),
            selected: location.pathname === '/',
          },
          {
            url: '/inventory',
            label: 'Inventario Imballaggi',
            icon: InventoryMajor,
            onClick: () => navigate('/inventory'),
            selected: location.pathname === '/inventory',
          },
          {
            url: '/mapping',
            label: 'Mappatura Prodotti',
            icon: ProductsMajor,
            onClick: () => navigate('/mapping'),
            selected: location.pathname === '/mapping',
          },
          {
            url: '/shipping-rules',
            label: 'Regole di Spedizione',
            icon: SettingsMajor,
            onClick: () => navigate('/shipping-rules'),
            selected: location.pathname === '/shipping-rules',
          },
          {
            url: '/reports',
            label: 'Report e Dichiarazioni',
            icon: ReportMinor,
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
