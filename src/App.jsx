import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  List, 
  Calendar, 
  Upload, 
  Link, 
  LogOut, 
  Menu, 
  Clock, 
  Sun, 
  Moon 
} from 'lucide-react';

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

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/trades': 'Trades',
  '/journal': 'Journal',
  '/calendar': 'Calendar',
  '/import': 'Import',
  '/mt5': 'MT5 Sync',
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Framer Motion Page Transition Wrapper
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};
const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2
};
const AnimatedPage = ({ children }) => (
  <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ height: '100%' }}>
    {children}
  </motion.div>
);

function AppShell({ children }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const clock = useClock();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarClosed, setDesktopSidebarClosed] = useState(false);

  if (!user) return <>{children}</>;

  const pageTitle = PAGE_TITLES[location.pathname] || 'TradeJournal';
  const dateStr = clock.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const userEmail = user.email || '';
  const userName = userEmail.split('@')[0];
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="sidebar-overlay" 
            onClick={() => setMobileSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''} ${desktopSidebarClosed ? 'desktop-closed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">TJ</div>
          <span className="brand-text">TradeJournal</span>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{userInitial}</div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-email">{userEmail}</span>
          </div>
        </div>

        <div className="sidebar-nav">
          <span className="nav-section-label">Menu</span>
          <NavLink to="/dashboard" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <LayoutDashboard size={18} className="sidebar-icon" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/journal" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <BookOpen size={18} className="sidebar-icon" />
            <span>Journal</span>
          </NavLink>
          <NavLink to="/trades" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <List size={18} className="sidebar-icon" />
            <span>Trades</span>
          </NavLink>
          <NavLink to="/calendar" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <Calendar size={18} className="sidebar-icon" />
            <span>Calendar</span>
          </NavLink>

          <span className="nav-section-label">Tools</span>
          <NavLink to="/import" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <Upload size={18} className="sidebar-icon" />
            <span>Import CSV</span>
          </NavLink>
          <NavLink to="/mt5" className="sidebar-link" onClick={() => setMobileSidebarOpen(false)}>
            <Link size={18} className="sidebar-icon" />
            <span>MT4/MT5 Sync</span>
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={signOut} style={{ color: 'var(--neg)', padding: '12px 16px', background: 'transparent' }}>
            <LogOut size={18} className="sidebar-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className={`main-area ${desktopSidebarClosed ? 'desktop-closed' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button 
              className="topbar-menu-btn" 
              onClick={() => {
                if (window.innerWidth <= 860) setMobileSidebarOpen(true);
                else setDesktopSidebarClosed(!desktopSidebarClosed);
              }}
            >
              <Menu size={20} />
            </button>
            <div className="topbar-title">
              <h2>{pageTitle}</h2>
              <span className="topbar-date">{dateStr}</span>
            </div>
          </div>
          
          <div className="topbar-right">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="topbar-clock">
              <Clock size={14} />
              <span>{timeStr}</span>
            </div>
            <div className="user-avatar" style={{ margin: 0, width: '32px', height: '32px' }}>{userInitial}</div>
          </div>
        </header>

        <main className="page-content">
          <AnimatePresence mode="wait">
            <AnimatedPage key={location.pathname}>
              {children}
            </AnimatedPage>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
