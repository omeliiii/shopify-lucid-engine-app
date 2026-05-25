import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Mapping from './pages/Mapping';
import ShippingRules from './pages/ShippingRules';
import Reports from './pages/Reports';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/mapping" element={<Mapping />} />
        <Route path="/shipping-rules" element={<ShippingRules />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
