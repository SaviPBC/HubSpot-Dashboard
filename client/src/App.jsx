import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AboutToImplement from './pages/AboutToImplement';
import Implementing from './pages/Implementing';
import Launched from './pages/Launched';
import Renewals from './pages/Renewals';
import Settings from './pages/Settings';
import TamComparison from './pages/TamComparison';
import WebinarComparison from './pages/WebinarComparison';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/about-to-implement" element={<AboutToImplement />} />
            <Route path="/implementing" element={<Implementing />} />
            <Route path="/launched" element={<Launched />} />
            <Route path="/renewals" element={<Renewals />} />
            <Route path="/tam-comparison" element={<TamComparison />} />
            <Route path="/webinar-comparison" element={<WebinarComparison />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
