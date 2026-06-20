/**
 * frontend/src/pages/AdminDashboard.jsx
 * Placeholder for the backend admin panel.
 * Will be expanded with full CRUD views in subsequent tasks.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { icon: '📦', label: 'Products',           path: '/admin/products' },
  { icon: '🏷️', label: 'Categories',         path: '/admin/categories' },
  { icon: '💳', label: 'Payment Methods',    path: '/admin/payments' },
  { icon: '🎟️', label: 'Coupon & Promotion', path: '/admin/coupons' },
  { icon: '📅', label: 'Bookings',           path: '/admin/bookings' },
  { icon: '👥', label: 'Users / Employees',  path: '/admin/users' },
  { icon: '🍳', label: 'Kitchen Display',    path: '/kds' },
  { icon: '📊', label: 'Reports',            path: '/admin/reports' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-lg">
              ☕
            </div>
            <div>
              <p className="text-white font-bold text-sm">Odoo Cafe POS</p>
              <p className="text-gray-500 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400
                         hover:text-white hover:bg-gray-800 transition-all text-sm font-medium"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => navigate('/pos')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-amber-400
                       hover:bg-amber-500/10 transition-colors text-sm font-semibold"
          >
            <span>🖥️</span> Open POS Terminal
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500
                       hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm"
          >
            <span>🚪</span> Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name || 'Admin'} 👋
          </h1>
          <p className="text-gray-400 mt-1">Manage your cafe from the panel below.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {NAV.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-gray-900/80 border border-gray-700/60 hover:border-amber-500/40
                         rounded-2xl p-6 text-center transition-all duration-200 hover:bg-gray-800/80
                         hover:-translate-y-0.5 group"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <p className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">
                {item.label}
              </p>
            </button>
          ))}
        </div>

        {/* Quick-access POS button */}
        <div className="mt-8 p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">POS Terminal</h2>
            <p className="text-gray-400 text-sm mt-1">Launch the cashier interface to start taking orders.</p>
          </div>
          <button
            onClick={() => navigate('/pos')}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400
                       hover:to-orange-400 text-gray-900 font-bold rounded-xl shadow-lg
                       shadow-amber-500/25 transition-all hover:scale-105"
          >
            Open Terminal →
          </button>
        </div>
      </main>
    </div>
  );
}
