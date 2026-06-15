import React, { useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import useLocalStorage from './hooks/useLocalStorage';

// Pages
import HomePage from './pages/HomePage';
import TestPage from './pages/TestPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ManageQuestionsPage from './pages/ManageQuestionsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminResultsPage from './pages/AdminResultsPage';
import AdminRekapPage from './pages/AdminRekapPage';
import AdminSchedulesPage from './pages/AdminSchedulesPage';
import PengawasanSppgPage from './pages/pengawasan/PengawasanSppgPage';
import PengawasanJasaBogaPage from './pages/pengawasan/PengawasanJasaBogaPage';

// Auth Context
export const AuthContext = React.createContext<{
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
} | null>(null);

const ADMIN_PASSWORD = 'admin123';

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const auth = React.useContext(AuthContext);
  if (!auth?.isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

function App() {
  const [isAdmin, setIsAdmin] = useLocalStorage('isAdmin', false);

  const authContextValue = useMemo(() => ({
    isAdmin,
    login: (password: string) => {
      if (password.trim().toLowerCase() === ADMIN_PASSWORD.toLowerCase()) {
        setIsAdmin(true);
        return true;
      }
      return false;
    },
    logout: () => {
      setIsAdmin(false);
    },
  }), [isAdmin, setIsAdmin]);

  return (
    <AuthContext.Provider value={authContextValue}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test/:testType" element={<TestPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route 
            path="/admin/dashboard" 
            element={<AdminRoute><AdminDashboardPage /></AdminRoute>} 
          />
          <Route 
            path="/admin/questions" 
            element={<AdminRoute><ManageQuestionsPage /></AdminRoute>} 
          />
          <Route 
            path="/admin/settings" 
            element={<AdminRoute><AdminSettingsPage /></AdminRoute>} 
          />
          <Route 
            path="/admin/results" 
            element={<AdminRoute><AdminResultsPage /></AdminRoute>} 
          />
          <Route 
            path="/admin/rekap" 
            element={<AdminRoute><AdminRekapPage /></AdminRoute>} 
          />
          <Route 
            path="/admin/schedules" 
            element={<AdminRoute><AdminSchedulesPage /></AdminRoute>} 
          />
          <Route 
            path="/admin/pengawasan" 
            element={<AdminRoute><PengawasanSppgPage /></AdminRoute>} 
          />
          <Route 
            path="/admin/pengawasan-jasaboga" 
            element={<AdminRoute><PengawasanJasaBogaPage /></AdminRoute>} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}

export default App;