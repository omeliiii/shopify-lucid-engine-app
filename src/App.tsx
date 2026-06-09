import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Layout,
  Card,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
} from '@shopify/polaris';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Mapping from './pages/Mapping';
import Groups from './pages/Groups';
import ShippingRules from './pages/ShippingRules';
import Reports from './pages/Reports';
import BillingStart from './pages/BillingStart';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import { BillingProvider, useBilling } from './contexts/BillingProvider';
import { BillingReturnHandler } from './components/BillingReturnHandler';
import { TourProvider } from './contexts/TourProvider';
import Tour from './components/Tour';

// ── Paywall Gate ───────────────────────────────────────────────────────────────
// Redirects to the billing/start page when no active subscription exists.
function PaywallGate({ children }: { children: React.ReactNode }) {
  const { isPaywallRequired, loading } = useBilling();

  // Show a skeleton while billing/auth state is loading so the page doesn't
  // appear blank during the initial Shopify admin handshake.
  if (loading) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={3} />
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={8} />
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  if (isPaywallRequired) {
    return <Navigate to="/billing/start" replace />;
  }

  return <>{children}</>;
}

// ── App ────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BillingProvider>
      <TourProvider>
        <BillingReturnHandler />
        <Tour />
        <MainLayout>
          <Routes>
            {/* Billing pages — always accessible */}
            <Route path="/billing/start" element={<BillingStart />} />

            {/* Protected pages — require active subscription */}
            <Route
              path="/"
              element={
                <PaywallGate><Dashboard /></PaywallGate>
              }
            />
            <Route
              path="/inventory"
              element={
                <PaywallGate><Inventory /></PaywallGate>
              }
            />
            <Route
              path="/mapping"
              element={
                <PaywallGate><Mapping /></PaywallGate>
              }
            />
            <Route
              path="/groups"
              element={
                <PaywallGate><Groups /></PaywallGate>
              }
            />
            <Route
              path="/shipping-rules"
              element={
                <PaywallGate><ShippingRules /></PaywallGate>
              }
            />
            <Route
              path="/reports"
              element={
                <PaywallGate><Reports /></PaywallGate>
              }
            />
            <Route
              path="/settings"
              element={
                <PaywallGate><Settings /></PaywallGate>
              }
            />
            <Route
              path="/privacy"
              element={
                <PaywallGate><Privacy /></PaywallGate>
              }
            />
            {/* Legacy route — keep old links working */}
            <Route path="/subscription" element={<Navigate to="/settings" replace />} />
          </Routes>
        </MainLayout>
      </TourProvider>
    </BillingProvider>
  );
}

export default App;
