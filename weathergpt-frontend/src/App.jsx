import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { WeatherProvider } from './context/WeatherContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { AuthModal } from './components/auth/AuthModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Assistant } from './pages/Assistant';
import { WeatherMapPage } from './pages/WeatherMapPage';
import { Alerts } from './pages/Alerts';
import { Climate } from './pages/Climate';
import { Settings } from './pages/Settings';
import { CommunityReports } from './pages/CommunityReports';

import { AlertToast } from './components/alerts/AlertToast';
import { useWeather } from './context/WeatherContext';

function AppContent() {
  const { latestToast, dismissToast } = useWeather();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Sticky Top Navigation */}
      <Navbar />

      {/* Real-time WebSocket Alert Toast */}
      <AlertToast alert={latestToast} onDismiss={dismissToast} />

      {/* Login & Signup Modal */}
      <AuthModal />

      {/* Main Body with Sidebar + Viewport */}
      <div className="flex-1 flex w-full">
        {/* Desktop Left Sidebar */}
        <Sidebar />

        {/* Main Scrollable Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden mb-16 md:mb-0">
          <Routes>
            <Route path="/" element={<Assistant />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assistant" element={<Navigate to="/" replace />} />
            <Route path="/map" element={<WeatherMapPage />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/community-reports" element={<CommunityReports />} />
            <Route path="/climate" element={<Climate />} />
            <Route path="/climate-analytics" element={<Climate />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WeatherProvider>
            <Router>
              <AppContent />
            </Router>
          </WeatherProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;


