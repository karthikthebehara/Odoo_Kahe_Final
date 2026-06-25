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
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .shimmer-text {
          background: linear-gradient(90deg, #C2A688 0%, #FDFBF7 40%, #D07A56 70%, #C2A688 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
      `}</style>
      <div className="min-h-screen bg-cafe-espresso flex items-center justify-center p-4 relative font-sans overflow-hidden">
        
        {/* Video background */}
        <video autoPlay loop muted playsInline poster="/cafe-hero.png"
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-30">
          <source src="https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b97f9040c0e6e8e05051930b1&profile_id=139&oauth2_token_id=57447761" type="video/mp4" />
        </video>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-cafe-espresso/60 via-transparent to-cafe-espresso z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-cafe-espresso/80 via-transparent to-cafe-espresso/80 z-10" />
        
        {/* Floating decorative circles */}
        <div className="absolute top-32 left-16 w-64 h-64 bg-cafe-latte/5 rounded-full blur-3xl z-10" />
        <div className="absolute bottom-32 right-16 w-80 h-80 bg-cafe-terracotta/5 rounded-full blur-3xl z-10" />

        <div className="relative z-20 w-full max-w-md">
          {/* Card */}
          <div className="bg-[#120C07]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl p-8 lg:p-10">

            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-cafe-latte to-cafe-terracotta rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(194,166,136,0.3)] mb-4 hover:scale-105 transition-transform duration-300">
                <CoffeeIcon />
              </div>
              <h1 className="text-4xl font-black tracking-tight font-serif shimmer-text mb-1">Odoo Cafe</h1>
              <p className="text-cafe-latte/80 text-xs font-bold uppercase tracking-widest mt-1">Portal Access</p>
            </div>

            {/* Role tabs */}
            <div className="flex bg-black/40 rounded-2xl p-1.5 mb-8 gap-1.5 border border-white/5 shadow-inner">
              {ROLES.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300
                    ${role === r.key
                      ? 'bg-gradient-to-r from-cafe-latte to-[#bfa180] text-cafe-espresso shadow-lg scale-[1.02]'
                      : 'text-cafe-cream/50 hover:text-cafe-cream hover:bg-white/5'}`}
                >
                  <span className="block">{r.label}</span>
                  <span className={`block text-[9px] mt-0.5 ${role === r.key ? 'text-cafe-espresso/80 font-semibold' : 'opacity-60 font-medium'}`}>{r.hint}</span>
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-cafe-cream/60 mb-2 uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative group">
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={role === 'admin' ? 'admin@odoocafe.com' : 'employee@odoocafe.com'}
                    className="w-full bg-black/30 border border-white/10 text-cafe-cream rounded-2xl px-5 py-4
                               placeholder-cafe-cream/20 focus:outline-none focus:border-cafe-latte focus:ring-1 focus:ring-cafe-latte/50
                               transition-all duration-300 text-sm font-semibold group-hover:border-white/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-cafe-cream/60 mb-2 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative group">
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/30 border border-white/10 text-cafe-cream rounded-2xl px-5 py-4 pr-12
                               placeholder-cafe-cream/20 focus:outline-none focus:border-cafe-latte focus:ring-1 focus:ring-cafe-latte/50
                               transition-all duration-300 text-sm font-semibold group-hover:border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-cafe-cream/40 hover:text-cafe-latte
                               transition-colors duration-200 p-1"
                  >
                    <EyeIcon show={showPwd} />
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3.5 text-sm text-red-400 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <span className="mt-0.5">⚠</span>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cafe-terracotta to-orange-500 hover:from-orange-500 hover:to-cafe-terracotta disabled:opacity-50 disabled:cursor-not-allowed text-white
                           font-black py-4 rounded-2xl shadow-[0_8px_30px_rgba(208,122,86,0.3)] hover:shadow-[0_8px_40px_rgba(208,122,86,0.5)] transition-all
                           duration-300 text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:-translate-y-0.5 mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  `Access ${role === 'admin' ? 'Dashboard' : 'Terminal'}`
                )}
              </button>
            </form>

            {/* Demo hint */}
            <div className="mt-8 rounded-2xl bg-black/30 border border-white/5 p-5 text-xs text-cafe-cream/50">
              <p className="font-black text-cafe-latte mb-3 uppercase tracking-widest text-[10px] flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cafe-latte rounded-full animate-pulse"></span>
                Demo Credentials
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2">
                  <span className="font-semibold text-cafe-cream/70">Admin</span>
                  <span className="text-cafe-latte font-mono font-bold">admin@odoocafe.com / admin123</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2">
                  <span className="font-semibold text-cafe-cream/70">Cashier</span>
                  <span className="text-cafe-latte font-mono font-bold">employee@odoocafe.com / emp123</span>
                </div>
              </div>
            </div>

            {/* Signup link */}
            <p className="text-center text-xs text-cafe-cream/40 mt-6 font-medium">
              New staff member?{' '}
              <Link to="/signup" className="text-cafe-latte hover:text-white font-bold transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
