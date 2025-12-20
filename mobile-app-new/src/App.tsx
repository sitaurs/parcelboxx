import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import WhatsApp from './pages/WhatsApp';
import Settings from './pages/Settings';
import DeviceSettings from './pages/DeviceSettings';
import DeviceTest from './pages/DeviceTest';

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="settings" element={<Settings />} />
          <Route path="device-settings" element={<DeviceSettings />} />
          <Route path="device-test" element={<DeviceTest />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
