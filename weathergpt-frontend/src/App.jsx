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
import { LocationPermissionGate } from './components/location/LocationPermissionGate';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Assistant } from './pages/Assistant';
import { WeatherMapPage } from './pages/WeatherMapPage';
import { Alerts } from './pages/Alerts';
import { Climate } from './pages/Climate';
import { Settings } from './pages/Settings';
import { CommunityReports } from './pages/CommunityReports';
import { Auth } from './pages/Auth';

import { AlertToast } from './components/alerts/AlertToast';
import { useWeather } from './context/WeatherContext';

function AppContent() {
  const { latestToast, dismissToast, locationReady } = useWeather();

  if (!locationReady) {
    return <LocationPermissionGate />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080d1a] text-slate-100 dark:bg-[#080d1a] dark:text-slate-100">
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
        <main className="flex-1 min-w-0 overflow-x-hidden px-2.5 py-3 sm:px-6 sm:py-6 lg:p-8 xl:p-10 2xl:p-12 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 transition-all duration-300">
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
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
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
            </Router>
          </WeatherProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
