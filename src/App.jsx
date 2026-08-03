import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TradeLog from './pages/TradeLog';
import Import from './pages/Import';
import CalendarPage from './pages/Calendar';
import Mt5Sync from './pages/Mt5Sync';
import Landing from './pages/Landing';

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

function Nav() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <nav className="navbar">
      <div className="brand">TradeJournal</div>
      <div className="links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/trades">Trade Log</NavLink>
        <NavLink to="/calendar">Calendar</NavLink>
        <NavLink to="/import">Import</NavLink>
        <NavLink to="/mt5">MT4/5 Sync</NavLink>
      </div>
      <button className="btn-ghost" onClick={signOut}>Sign out</button>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <main className="page">
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/trades" element={<PrivateRoute><TradeLog /></PrivateRoute>} />
            <Route path="/import" element={<PrivateRoute><Import /></PrivateRoute>} />
            <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
            <Route path="/mt5" element={<PrivateRoute><Mt5Sync /></PrivateRoute>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
