/**
 * frontend/src/App.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root of the Odoo Cafe POS React app.
 *
 * Route map:
 *   /              → redirect → /login
 *   /login         → Login page (public)
 *   /pos           → POS Terminal (protected — any authenticated role)
 *   /kds           → Kitchen Display (protected — any role, meant for kitchen screen)
 *   /admin         → Admin Dashboard (protected — admin role only)
 *   /admin/*       → Admin sub-routes (placeholder — expanded per task)
 *
 * Global providers mounted here:
 *   AuthProvider  → user + token state
 *   CartProvider  → real-time cart state with computed totals
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// ── Code-split page imports ───────────────────────────────────────────────────
const Login          = lazy(() => import('./pages/Login'));
const PosTerminal    = lazy(() => import('./pages/PosTerminal'));
const Kds            = lazy(() => import('./pages/Kds'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// ── Full-page loading spinner ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    </div>
  );
}

// ── Protected route wrapper ───────────────────────────────────────────────────
function ProtectedRoute({ adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/pos" replace />;
  return <Outlet />;
}

// ── Public-only route (redirects authenticated users away from login) ─────────
function PublicRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/pos'} replace />;
  return <Outlet />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Default redirect */}
        <Route index element={<Navigate to="/login" replace />} />

        {/* Public routes — redirect if already logged in */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected — any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/pos"  element={<PosTerminal />} />
          <Route path="/kds"  element={<Kds />} />
        </Route>

        {/* Protected — admin only */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin"               element={<AdminDashboard />} />
          {/* Sub-routes (will be filled in subsequent tasks) */}
          <Route path="/admin/products"      element={<AdminDashboard />} />
          <Route path="/admin/categories"    element={<AdminDashboard />} />
          <Route path="/admin/payments"      element={<AdminDashboard />} />
          <Route path="/admin/coupons"       element={<AdminDashboard />} />
          <Route path="/admin/bookings"      element={<AdminDashboard />} />
          <Route path="/admin/users"         element={<AdminDashboard />} />
          <Route path="/admin/reports"       element={<AdminDashboard />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
