/**
 * frontend/src/pages/Signup.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only employee registration page.
 * Creates a new user (cashier or kitchen staff) in the system.
 * On success: redirects → /login
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const CoffeeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    className="w-8 h-8 text-white" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 010 8h-1"/>
    <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/>
    <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/>
    <line x1="14" y1="1" x2="14" y2="4"/>
  </svg>
);

const EyeIcon = ({ show }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
    {show
      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    }
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    className="w-4 h-4 text-gray-500" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    className="w-4 h-4 text-gray-500" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    className="w-4 h-4 text-gray-500" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

const ROLES = [
  { key: 'customer', label: 'Customer', hint: 'Online / Table Order', icon: '🛍️' },
  { key: 'employee', label: 'Employee', hint: 'Cashier / POS Operator', icon: '🧾' },
  { key: 'admin',    label: 'Admin',    hint: 'Manager / Back-office',  icon: '🛡️' },
];

// ── Password strength meter ───────────────────────────────────────────────────
function strengthScore(pwd) {
  let score = 0;
  if (pwd.length >= 8)             score++;
  if (/[A-Z]/.test(pwd))          score++;
  if (/[0-9]/.test(pwd))          score++;
  if (/[^A-Za-z0-9]/.test(pwd))   score++;
  return score;
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

export default function Signup() {
  const navigate = useNavigate();

  const [role,       setRole]       = useState('employee');
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const score = password ? strengthScore(password) : 0;
  const passwordsMatch = confirm && password === confirm;
  const passwordsMismatch = confirm && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.signup({ name: name.trim(), email, password, role });
      setSuccess(`Account created for ${name.trim()}! Redirecting to login…`);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-40 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Back to login */}
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-5 w-fit transition-colors duration-150"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
          Back to Login
        </Link>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/60 rounded-3xl shadow-2xl p-8">

          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4">
              <CoffeeIcon />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
            <p className="text-gray-400 text-sm mt-1">Register a new staff member</p>
          </div>

          {/* Role selector */}
          <div className="flex bg-gray-800/70 rounded-xl p-1 mb-6 gap-1">
            {ROLES.map(r => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${role === r.key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white'}`}
              >
                <span className="block">{r.icon} {r.label}</span>
                <span className="block text-[10px] opacity-75">{r.hint}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <UserIcon />
                </div>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-3
                             placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1
                             focus:ring-amber-500/50 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <MailIcon />
                </div>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={role === 'admin' ? 'manager@cafe.com' : 'john@cafe.com'}
                  className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-3
                             placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1
                             focus:ring-amber-500/50 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  id="signup-password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl pl-9 pr-10 py-3
                             placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1
                             focus:ring-amber-500/50 transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-400 transition-colors"
                >
                  <EyeIcon show={showPwd} />
                </button>
              </div>

              {/* Strength meter */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i <= score ? STRENGTH_COLORS[score] : '#374151' }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: STRENGTH_COLORS[score] }}>
                    {STRENGTH_LABELS[score]}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  id="signup-confirm"
                  type={showConf ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full bg-gray-800/80 border text-white rounded-xl pl-9 pr-10 py-3
                             placeholder-gray-500 focus:outline-none focus:ring-1 transition-all duration-200 text-sm
                             ${passwordsMismatch
                               ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30'
                               : passwordsMatch
                                 ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/30'
                                 : 'border-gray-700 focus:border-amber-500 focus:ring-amber-500/50'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-400 transition-colors"
                >
                  <EyeIcon show={showConf} />
                </button>
                {passwordsMatch && (
                  <div className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-400">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                )}
              </div>
              {passwordsMismatch && (
                <p className="text-red-400 text-[11px] mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400 flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">✅</span>
                <span>{success}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={loading || !!success}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400
                         hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950
                         font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/25 transition-all
                         duration-200 text-sm tracking-wide flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-900/40 border-t-gray-900 rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                `Create ${role === 'admin' ? 'Admin' : role === 'employee' ? 'Employee' : 'Customer'} Account`
              )}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
