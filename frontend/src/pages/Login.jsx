/**
 * frontend/src/pages/Login.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dual-role login page (Admin vs Employee tab toggle).
 * On success: stores JWT, redirects → /pos (employee) or /admin (admin).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';

// ── SVG icons (inline, no extra deps) ────────────────────────────────────────
const CoffeeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    className="w-10 h-10 text-amber-400" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 010 8h-1"/>
    <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/>
    <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/>
    <line x1="14" y1="1" x2="14" y2="4"/>
  </svg>
);

const EyeIcon = ({ show }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
    {show
      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    }
  </svg>
);

const ROLES = [
  { key: 'employee', label: 'Employee', hint: 'Cashier / POS Operator' },
  { key: 'admin',    label: 'Admin',    hint: 'Manager / Back-office'  },
];

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [role,        setRole]        = useState('employee');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      login(res.user, res.token);
      navigate(res.user.role === 'admin' ? '/admin' : '/pos', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex items-center justify-center p-4">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/60 rounded-3xl shadow-2xl p-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <CoffeeIcon />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Odoo Cafe POS</h1>
            <p className="text-gray-400 text-sm mt-1">Sign in to start your session</p>
          </div>

          {/* Role tabs */}
          <div className="flex bg-gray-800/70 rounded-xl p-1 mb-6 gap-1">
            {ROLES.map(r => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${role === r.key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white'}`}
              >
                <span className="block font-semibold">{r.label}</span>
                <span className="block text-[10px] opacity-75">{r.hint}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={role === 'admin' ? 'admin@odoocafe.com' : 'employee@odoocafe.com'}
                className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-4 py-3
                           placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1
                           focus:ring-amber-500/50 transition-all duration-200 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-4 py-3 pr-12
                             placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1
                             focus:ring-amber-500/50 transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-400
                             transition-colors duration-150"
                >
                  <EyeIcon show={showPwd} />
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400
                         hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950
                         font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/25 transition-all
                         duration-200 text-sm tracking-wide flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-900/40 border-t-gray-900 rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                `Sign in as ${role === 'admin' ? 'Admin' : 'Employee'}`
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 rounded-xl bg-gray-800/50 border border-gray-700/50 p-3 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Demo credentials</p>
            <p>Admin:    <span className="text-amber-400 font-mono">admin@odoocafe.com / admin123</span></p>
            <p>Cashier:  <span className="text-amber-400 font-mono">employee@odoocafe.com / emp123</span></p>
          </div>

          {/* Signup link */}
          <p className="text-center text-sm text-gray-500 mt-4">
            New staff member?{' '}
            <Link to="/signup" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
