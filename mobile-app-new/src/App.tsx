import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import Login from './pages/Login';
import PinLock from './pages/PinLock';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import WhatsApp from './pages/WhatsApp';
import Settings from './pages/Settings';
import DeviceControl from './pages/DeviceControl';
import TestDevice from './pages/TestDevice';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pin-lock" element={<PinLock />} />

      <Route path="/" element={
        <AuthGuard>
          <Layout />
        </AuthGuard>
      }>
        <Route index element={<Dashboard />} />
        <Route path="history" element={<History />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="settings" element={<Settings />} />
        <Route path="device-control" element={<DeviceControl />} />
        <Route path="test-device" element={<TestDevice />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
