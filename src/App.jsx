import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TradeLog from './pages/TradeLog';
import Import from './pages/Import';
import CalendarPage from './pages/Calendar';
import Mt5Sync from './pages/Mt5Sync';
import Landing from './pages/Landing';
import Journal from './pages/Journal';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading...</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

/* --- Page title map --- */
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/trades': 'Trades',
  '/journal': 'Journal',
  '/calendar': 'Calendar',
  '/import': 'Import',
  '/mt5': 'MT5 Sync',
};

/* --- Live clock hook --- */
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* --- Sidebar + Top bar layout --- */
function AppShell({ children }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const clock = useClock();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarClosed, setDesktopSidebarClosed] = useState(false);

  if (!user) return <>{children}</>;

  const pageTitle = PAGE_TITLES[location.pathname] || 'TradeJournal';
  const dateStr = clock.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const userEmail = user.email || '';
  const userName = userEmail.split('@')[0].toUpperCase();
  const userInitial = userName.charAt(0);

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''} ${desktopSidebarClosed ? 'desktop-closed' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">TJ</div>
          <span className="brand-text">TradeJournal</span>
        </div>

        {/* User card */}
        <div className="sidebar-user">
          <div className="user-avatar">{userInitial}</div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-email">{userEmail}</span>
          </div>
        </div>

        {/* Nav: MENU */}
        <div className="sidebar-section">
          <span className="sidebar-section-label">MENU</span>
          <NavLink to="/dashboard" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/journal" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-icon">📓</span>
            <span>Journal</span>
          </NavLink>
          <NavLink to="/trades" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-icon">📋</span>
            <span>Trades</span>
          </NavLink>
          <NavLink to="/calendar" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-icon">📅</span>
            <span>Calendar</span>
          </NavLink>
        </div>

        {/* Nav: TOOLS */}
        <div className="sidebar-section">
          <span className="sidebar-section-label">TOOLS</span>
          <NavLink to="/import" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-icon">📥</span>
            <span>Import CSV</span>
          </NavLink>
          <NavLink to="/mt5" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-icon">🔗</span>
            <span>MT4/MT5 Sync</span>
          </NavLink>
        </div>

        {/* Nav: ACCOUNT */}
        <div className="sidebar-section" style={{ marginTop: 'auto' }}>
          <span className="sidebar-section-label">ACCOUNT</span>
          <button className="sidebar-link signout-btn" onClick={signOut}>
            <span className="sidebar-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>

        {/* Bottom branding */}
        <div className="sidebar-footer">
          <span>TradeJournal</span>
          <span className="muted">v1.0</span>
        </div>
      </aside>

      {/* Main area */}
      <div className={`main-area ${desktopSidebarClosed ? 'desktop-closed' : ''}`}>
        {/* Top bar */}
        <header className="topbar">
          <button 
            className="topbar-menu-btn" 
            onClick={() => {
              if (window.innerWidth <= 860) setMobileSidebarOpen(true);
              else setDesktopSidebarClosed(!desktopSidebarClosed);
            }}
          >
            ☰
          </button>
          <div className="topbar-title">
            <h2>{pageTitle}</h2>
            <span className="topbar-date">{dateStr}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-clock">
              <span className="clock-icon">🕐</span>
              <span>{timeStr}</span>
            </div>
            <div className="topbar-avatar">{userInitial}</div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/journal" element={<PrivateRoute><Journal /></PrivateRoute>} />
            <Route path="/trades" element={<PrivateRoute><TradeLog /></PrivateRoute>} />
            <Route path="/import" element={<PrivateRoute><Import /></PrivateRoute>} />
            <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
            <Route path="/mt5" element={<PrivateRoute><Mt5Sync /></PrivateRoute>} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AuthProvider>
  );
}
