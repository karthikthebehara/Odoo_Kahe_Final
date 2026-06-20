/**
 * frontend/src/App.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Root of the Odoo Cafe POS React app.
 *
 * Route map:
 *   /        → redirect → /login
 *   /login   → Login page (public)
 *   /pos     → POS Terminal (always accessible for demo — no auth guard)
 *   /kds     → Kitchen Display Screen
 *   /admin   → Admin Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// ── Code-split page imports ───────────────────────────────────────────────────
const Login          = lazy(() => import('./pages/Login'));
const Signup         = lazy(() => import('./pages/Signup'));
const PosTerminal    = lazy(() => import('./pages/PosTerminal'));
const Kds            = lazy(() => import('./pages/Kds'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CoffeeSearch   = lazy(() => import('./pages/CoffeeSearch'));
const CustomerDisplay = lazy(() => import('./pages/CustomerDisplay'));

// ── Full-page loading spinner ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#030712',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid rgba(245,158,11,0.2)',
        borderTopColor: '#f59e0b',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP — open routes (no auth guards) for easy hackathon demo
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Default → POS terminal directly for demo */}
            <Route index element={<Navigate to="/pos" replace />} />

            {/* All pages freely accessible */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pos"    element={<PosTerminal />} />
            <Route path="/kds"    element={<Kds />} />
            <Route path="/admin"  element={<AdminDashboard />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/coffee" element={<CoffeeSearch />} />
            <Route path="/customer-display" element={<CustomerDisplay />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/pos" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
