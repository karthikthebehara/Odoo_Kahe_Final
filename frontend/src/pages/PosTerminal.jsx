/**
 * frontend/src/pages/PosTerminal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained POS Terminal — uses ONLY local React state (no context).
 *
 * Layout:
 *   TOP    → Sticky header with logo, nav, search bar
 *   LEFT   → Category filter tabs + scrollable product card grid
 *   RIGHT  → Cart panel: item rows (name/qty/price/line-total) + order summary
 *            + action buttons (Table View, Discount, Send to Kitchen)
 *
 * Modals:
 *   Floor/Table selector overlay
 *   Coupon / Discount entry popup
 *
 * All totals (Subtotal, Tax, Discount, Final Total) are recomputed
 * reactively inside a useReducer cart reducer on every state change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useReducer, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { categoriesAPI, productsAPI, ordersAPI, tablesAPI, couponsAPI, customersAPI } from '../utils/api';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════
const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

const hexToRgba = (hex, alpha = 1) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS (inline SVG — zero dependency)
// ═══════════════════════════════════════════════════════════════════════════════
const Icons = {
  Search: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Plus: ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Minus: ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  ),
  Table: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  ),
  Tag: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  Send: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Coffee: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17 8h1a4 4 0 010 8h-1" />
      <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
    </svg>
  ),
  Chair: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2v6M18 2v6M6 14v8M18 14v8M3 14h18M6 8h12" />
    </svg>
  ),
  Receipt: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// CART REDUCER
// ═══════════════════════════════════════════════════════════════════════════════
const computeTotals = (items, discount) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = items.reduce((s, i) => s + (i.price * i.qty * i.tax) / 100, 0);
  const total    = Math.max(0, subtotal + tax - discount);
  return { subtotal, tax, total };
};

const cartInit = {
  items: [],       // { id, name, price, tax, uom, color, qty }
  discount: 0,
  coupon: null,
  tableId: null,
  tableLabel: '',
  customerId: null,
  customerName: '',
  subtotal: 0,
  tax: 0,
  total: 0,
};

function cartReducer(state, action) {
  let items;
  switch (action.type) {

    case 'ADD': {
      const existing = state.items.find(i => i.id === action.product.id);
      items = existing
        ? state.items.map(i => i.id === action.product.id ? { ...i, qty: i.qty + 1 } : i)
        : [...state.items, { ...action.product, qty: 1 }];
      return { ...state, items, ...computeTotals(items, state.discount) };
    }

    case 'SET_QTY': {
      if (action.qty <= 0) {
        items = state.items.filter(i => i.id !== action.id);
      } else {
        items = state.items.map(i => i.id === action.id ? { ...i, qty: action.qty } : i);
      }
      return { ...state, items, ...computeTotals(items, state.discount) };
    }

    case 'REMOVE': {
      items = state.items.filter(i => i.id !== action.id);
      return { ...state, items, ...computeTotals(items, state.discount) };
    }

    case 'APPLY_COUPON': {
      const { subtotal, tax } = computeTotals(state.items, 0);
      const base = subtotal + tax;
      const disc = action.coupon.type === 'percent'
        ? (base * action.coupon.value) / 100
        : action.coupon.value;
      const discount = Math.min(disc, base);
      return { ...state, coupon: action.coupon, discount, ...computeTotals(state.items, discount) };
    }

    case 'REMOVE_COUPON':
      return { ...state, coupon: null, discount: 0, ...computeTotals(state.items, 0) };

    case 'SET_TABLE':
      return { ...state, tableId: action.tableId, tableLabel: action.label };

    case 'SET_CUSTOMER':
      return { ...state, customerId: action.customerId, customerName: action.name };

    case 'CLEAR':
      return { ...cartInit };

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Category Tab ─────────────────────────────────────────────────────────────
function CategoryTab({ cat, isActive, onClick }) {
  return (
    <button
      id={`cat-tab-${cat.id}`}
      onClick={onClick}
      style={isActive
        ? { backgroundColor: cat.color, boxShadow: `0 0 18px ${hexToRgba(cat.color, 0.45)}` }
        : { borderColor: hexToRgba(cat.color, 0.35) }}
      className={[
        'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0',
        'transition-all duration-200 border',
        isActive
          ? 'text-white border-transparent'
          : 'bg-gray-800/60 text-gray-400 hover:text-white hover:border-gray-500',
      ].join(' ')}
    >
      {cat.name}
    </button>
  );
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, color, cartQty, onAdd, coffeeImage, fallbackImage }) {
  const [imgSrc,    setImgSrc]    = useState(coffeeImage);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgErr,    setImgErr]    = useState(false);

  // If coffeeImage prop changes (API resolves later), reset the src
  React.useEffect(() => {
    setImgSrc(coffeeImage);
    setImgLoaded(false);
    setImgErr(false);
  }, [coffeeImage]);

  const handleImgError = () => {
    // If primary URL broke and we have a fallback, swap to it
    if (fallbackImage && imgSrc !== fallbackImage) {
      setImgSrc(fallbackImage);
      setImgLoaded(false);
    } else {
      // Both broke — show the gradient tile
      setImgErr(true);
    }
  };

  return (
    <button
      id={`product-card-${product.id}`}
      onClick={() => onAdd(product)}
      className={[
        'group relative bg-gray-800/70 hover:bg-gray-700/80',
        'border border-gray-700/60 hover:border-gray-500',
        'rounded-2xl overflow-hidden text-left transition-all duration-200',
        'hover:shadow-2xl hover:-translate-y-1 active:translate-y-0',
        'focus:outline-none focus:ring-2 focus:ring-amber-500/50 flex flex-col',
      ].join(' ')}
    >
      {/* ── Top Image Area ───────────────────────────────────────────────── */}
      <div className="relative w-full h-32 overflow-hidden flex-shrink-0">
        {/* Colour-strip accent at very top */}
        <div
          className="absolute top-0 inset-x-0 h-[3px] z-10"
          style={{ backgroundColor: color }}
        />

        {/* Shimmer placeholder — shown while image loads */}
        {!imgLoaded && !imgErr && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(color, 0.25)} 0%, #1f2937 60%, ${hexToRgba(color, 0.15)} 100%)`,
            }}
          />
        )}

        {/* Product image — primary URL, falls back to fallbackImage on error */}
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={product.name}
            onLoad={() => setImgLoaded(true)}
            onError={handleImgError}
            className={[
              'w-full h-full object-cover transition-all duration-500',
              'group-hover:scale-110',
              imgLoaded ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />
        ) : (
          /* Both URLs failed — show themed gradient tile */
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(color, 0.4)} 0%, #111827 100%)`,
            }}
          >
            <Icons.Coffee />
          </div>
        )}

        {/* Gradient overlay so text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent" />

        {/* Cart badge — top-right of image */}
        {cartQty > 0 && (
          <div
            className="absolute top-3 right-3 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md"
            style={{ backgroundColor: color }}
          >
            {cartQty}
          </div>
        )}
      </div>

      {/* ── Text Body ────────────────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-3 space-y-1.5 flex-1">
        <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-amber-400 font-bold text-base">{fmt(product.price)}</span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md text-white"
            style={{ backgroundColor: hexToRgba(color, 0.35) }}
          >
            {product.uom}
          </span>
        </div>
        {product.tax > 0 && (
          <p className="text-gray-500 text-[10px]">+{product.tax}% GST</p>
        )}
      </div>

      {/* Hover add pill — bottom-right */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
          <Icons.Plus size={12} />
        </div>
      </div>
    </button>
  );
}

// ── Cart Row ──────────────────────────────────────────────────────────────────
function CartRow({ item, onQty, onRemove }) {
  return (
    <div className="group flex items-start gap-3 py-3 border-b border-gray-800/60 last:border-0">
      {/* Category color dot */}
      <div
        className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: item.color || '#6366f1' }}
      />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{item.name}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          {fmt(item.price)} × {item.qty}
          {item.tax > 0 && (
            <span className="ml-1 text-gray-600">(+{item.tax}% GST)</span>
          )}
        </p>
      </div>

      {/* Qty Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          id={`cart-dec-${item.id}`}
          onClick={() => onQty(item.id, item.qty - 1)}
          className="w-6 h-6 rounded-lg bg-gray-700 hover:bg-red-500/20 hover:text-red-400 text-white flex items-center justify-center transition-colors"
        >
          <Icons.Minus size={12} />
        </button>
        <span className="text-white font-bold text-sm w-5 text-center select-none">{item.qty}</span>
        <button
          id={`cart-inc-${item.id}`}
          onClick={() => onQty(item.id, item.qty + 1)}
          className="w-6 h-6 rounded-lg bg-gray-700 hover:bg-amber-500/20 hover:text-amber-400 text-white flex items-center justify-center transition-colors"
        >
          <Icons.Plus size={12} />
        </button>
      </div>

      {/* Line total + remove */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-amber-400 font-bold text-sm">{fmt(item.price * item.qty)}</span>
        <button
          id={`cart-remove-${item.id}`}
          onClick={() => onRemove(item.id)}
          className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Icons.Trash />
        </button>
      </div>
    </div>
  );
}

// ── Table / Floor Modal ───────────────────────────────────────────────────────
function TableModal({ floors, onSelect, onClose }) {
  const [activeFloorId, setActiveFloorId] = useState(floors[0]?.id);
  const floor = floors.find(f => f.id === activeFloorId) || floors[0];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Icons.Table /> Select a Table
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {floor ? floor.tables.filter(t => t.status === 'free').length : 0} tables available on {floor ? floor.name : ''}
            </p>
          </div>
          <button
            id="table-modal-close"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        {/* Floor Tabs */}
        <div className="flex gap-2 px-6 pt-5 overflow-x-auto">
          {floors.map(f => (
            <button
              key={f.id}
              id={`floor-tab-${f.id}`}
              onClick={() => setActiveFloorId(f.id)}
              className={[
                'px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                f.id === activeFloorId
                  ? 'bg-amber-500 text-gray-900 shadow-lg shadow-amber-500/25'
                  : 'bg-gray-800 text-gray-400 hover:text-white',
              ].join(' ')}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Tables Grid */}
        <div className="p-6 grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
          {floor ? (floor.tables || []).map(t => {
            const isActive = t.status === 'active';
            return (
              <button
                key={t.id}
                id={`table-btn-${t.id}`}
                onClick={() => onSelect(t, floor)}
                className={[
                  'relative p-4 rounded-2xl border-2 text-center',
                  'transition-all duration-150 hover:scale-105 active:scale-100',
                  isActive
                    ? 'border-amber-500 bg-amber-500/10 hover:border-amber-400'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-500',
                ].join(' ')}
              >
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                )}
                <p className="text-white font-bold text-lg">{t.number}</p>
                <div className="flex items-center justify-center gap-1 mt-1 text-gray-400 text-xs">
                  <Icons.Chair />{t.seats} seats
                </div>
                <span className={[
                  'inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-500',
                ].join(' ')}>
                  {isActive ? 'In Use' : 'Free'}
                </span>
              </button>
            );
          }) : (
            <div className="col-span-4 text-center py-8 text-gray-500">
              No tables configured for this floor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Discount / Coupon Modal ───────────────────────────────────────────────────
function DiscountModal({ activeCoupon, onApply, onRemove, onClose }) {
  const [code,   setCode]   = useState('');
  const [error,  setError]  = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const validate = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { setError('Please enter a coupon code.'); return; }
    try {
      const promo = await couponsAPI.validate(c);
      setError('');
      setResult({
        code: promo.coupon_code,
        type: promo.discount_type === 'percentage' ? 'percent' : 'fixed',
        value: parseFloat(promo.value),
        label: promo.discount_type === 'percentage' ? `${promo.value}% off` : `₹${promo.value} off`
      });
    } catch (err) {
      setError(err.message || 'Invalid or expired coupon code.');
      setResult(null);
    }
  };

  const handleApply = () => {
    if (result) { onApply(result); onClose(); }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Icons.Tag /> Apply Discount
          </h2>
          <button
            id="discount-modal-close"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        {/* Active coupon pill */}
        {activeCoupon && (
          <div className="mb-4 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-4 py-3">
            <div className="text-emerald-400 text-xs font-semibold">
              Active: {activeCoupon.code} ({activeCoupon.label})
            </div>
            <button
              id="remove-coupon-btn"
              onClick={() => { onRemove(); onClose(); }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            id="coupon-input"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && validate()}
            placeholder="Enter coupon code…"
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            id="validate-coupon-btn"
            onClick={validate}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900 font-bold rounded-xl transition-colors text-sm"
          >
            Check
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-sm rounded-xl px-4 py-3 mb-3">
            {error}
          </div>
        )}

        {/* Valid result */}
        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Icons.Check /> {result.code} is valid — {result.label}
            </div>
          </div>
        )}

        {/* Apply button */}
        <button
          id="apply-coupon-btn"
          onClick={handleApply}
          disabled={!result}
          className={[
            'w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200',
            result
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed',
          ].join(' ')}
        >
          Confirm & Apply Discount
        </button>

        {/* Hint */}
        <p className="text-center text-gray-600 text-xs mt-4">
          Available: <span className="text-gray-500">WELCOME10 · FLAT50 · SAVE20</span>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — PosTerminal
// ═══════════════════════════════════════════════════════════════════════════════
export default function PosTerminal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ── Local State ─────────────────────────────────────────────────────────────
  const [cart, dispatch]       = useReducer(cartReducer, cartInit);

  const [activeCatId, setActiveCatId]   = useState(null); // null = All
  const [searchQuery, setSearchQuery]   = useState('');
  const [showTable,   setShowTable]     = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [sendState,   setSendState]     = useState('idle'); // 'idle' | 'sending' | 'sent'

  // Modal control states
  const [showCustomers, setShowCustomers] = useState(false);
  const [showOrders, setShowOrders]       = useState(false);
  const [showPayment, setShowPayment]     = useState(false);
  const [paymentOrder, setPaymentOrder]   = useState(null);
  const [showReceipt, setShowReceipt]     = useState(false);
  const [receiptOrder, setReceiptOrder]   = useState(null);
  const [showUserMenu, setShowUserMenu]   = useState(false);
  const [showSessionOpenModal, setShowSessionOpenModal]   = useState(false);
  const [showSessionCloseModal, setShowSessionCloseModal] = useState(false);

  // Dynamic API state
  const [categories, setCategories] = useState([]);
  const [products, setProducts]     = useState([]);
  const [dbFloors, setDbFloors]     = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  // ── Unified product-image map: title/keyword (lowercase) → imageUrl ─────────
  const [productImages, setProductImages] = useState({});

  useEffect(() => {
    /**
     * TIER-1  : sampleapis.com — hot coffee items  (title → image)
     * TIER-2  : TheMealDB     — Dessert + Breakfast categories (strMeal → strMealThumb)
     * TIER-3  : Curated Unsplash keyword map used as zero-fail fallback in resolveProductImage()
     *
     * All three sources are fetched in parallel; failures are silently swallowed
     * so the UI always has *something* to show.
     */
    const fetchAllImages = async () => {
      const map = {};

      // ── TIER-1 : Coffee API ──────────────────────────────────────────────────
      try {
        const [hotRes, icedRes] = await Promise.allSettled([
          fetch('https://api.sampleapis.com/coffee/hot'),
          fetch('https://api.sampleapis.com/coffee/iced'),
        ]);
        for (const result of [hotRes, icedRes]) {
          if (result.status === 'fulfilled' && result.value.ok) {
            const data = await result.value.json();
            (Array.isArray(data) ? data : []).forEach(item => {
              if (item.title && item.image) {
                map[item.title.toLowerCase()] = item.image;
              }
            });
          }
        }
      } catch (err) {
        console.warn('[ImagePipeline] Coffee API failed:', err.message);
      }

      // ── TIER-2 : TheMealDB — Dessert & Breakfast ─────────────────────────────
      try {
        const [dessertRes, breakfastRes, sideRes] = await Promise.allSettled([
          fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Dessert'),
          fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast'),
          fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Side'),
        ]);
        for (const result of [dessertRes, breakfastRes, sideRes]) {
          if (result.status === 'fulfilled' && result.value.ok) {
            const json = await result.value.json();
            (json.meals || []).forEach(meal => {
              if (meal.strMeal && meal.strMealThumb) {
                map[meal.strMeal.toLowerCase()] = meal.strMealThumb;
              }
            });
          }
        }
      } catch (err) {
        console.warn('[ImagePipeline] TheMealDB failed:', err.message);
      }

      setProductImages(map);
    };

    fetchAllImages();
  }, []);

  /**
   * TIER-3 : Curated keyword → Unsplash fallback map.
   * Stable direct Unsplash URLs — no API key, no redirects.
   *
   * Special keys prefixed with _cat_ are the category-level defaults used in T3c.
   *   _cat_beverages → high-quality coffee/drink photo
   *   _cat_bakery    → high-quality pastry/croissant photo
   *   _cat_desserts  → high-quality cake/dessert photo
   */
  const UNSPLASH_FALLBACKS = {
    // ── specific keywords ──────────────────────────────────────────────────────
    croissant:  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=600&auto=format&fit=crop',
    muffin:     'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?q=80&w=600&auto=format&fit=crop',
    cake:       'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=600&auto=format&fit=crop',
    chocolate:  'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=600&auto=format&fit=crop',
    cheese:     'https://images.unsplash.com/photo-1562777717-dc6984f65a63?q=80&w=600&auto=format&fit=crop',
    tart:       'https://images.unsplash.com/photo-1464195157462-3518ca5a2f0a?q=80&w=600&auto=format&fit=crop',
    pastry:     'https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=600&auto=format&fit=crop',
    bread:      'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop',
    cookie:     'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=600&auto=format&fit=crop',
    brownie:    'https://images.unsplash.com/photo-1515037893149-de7f840978e2?q=80&w=600&auto=format&fit=crop',
    donut:      'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=600&auto=format&fit=crop',
    waffle:     'https://images.unsplash.com/photo-1562376552-0d160a2f238d?q=80&w=600&auto=format&fit=crop',
    pancake:    'https://images.unsplash.com/photo-1528207776546-365bb710ee93?q=80&w=600&auto=format&fit=crop',
    latte:      'https://images.unsplash.com/photo-1561047029-3000c68339ca?q=80&w=600&auto=format&fit=crop',
    cappuccino: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop',
    espresso:   'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?q=80&w=600&auto=format&fit=crop',
    mocha:      'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?q=80&w=600&auto=format&fit=crop',
    americano:  'https://images.unsplash.com/photo-1520031441872-265e4ff70366?q=80&w=600&auto=format&fit=crop',
    matcha:     'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=600&auto=format&fit=crop',
    tea:        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=600&auto=format&fit=crop',
    juice:      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=600&auto=format&fit=crop',
    smoothie:   'https://images.unsplash.com/photo-1553530979-fbb9e4aee36f?q=80&w=600&auto=format&fit=crop',
    sandwich:   'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=600&auto=format&fit=crop',
    salad:      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop',
    // ── generic keyword keys (still used by T3a/T3b) ──────────────────────────
    bakery:     'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop',
    dessert:    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=600&auto=format&fit=crop',
    beverage:   'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
    coffee:     'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
    // ── T3c category-respected defaults (explicit, high-quality) ──────────────
    _cat_beverages: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
    _cat_bakery:    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=600&auto=format&fit=crop',
    _cat_desserts:  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=600&auto=format&fit=crop',
    // ── T3d absolute last-resort ───────────────────────────────────────────────
    default:    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop',
  };

  /**
   * resolveProductImage — four-tier lookup. NEVER returns null/undefined.
   *
   * T1  Exact title match in productImages (Coffee API / TheMealDB)
   * T2  Substring title match in productImages
   * T3a Exact keyword token match in UNSPLASH_FALLBACKS
   * T3b Partial keyword token match in UNSPLASH_FALLBACKS
   * T3c Category-name respected default  ← NEW
   *       "Beverages"  → premium coffee photo
   *       "Bakery"     → warm pastry/croissant photo
   *       "Desserts"   → rich cake/dessert photo
   * T3d Absolute last-resort default image
   *
   * @param {object} product  — { name, ... }
   * @param {string} catName  — category display name e.g. "Bakery", "Beverages"
   * @returns {string} image URL
   */
  const resolveProductImage = useCallback((product, catName = '') => {
    const nameLower = product.name.toLowerCase();
    const catLower  = catName.toLowerCase().trim();
    const tokens    = [...nameLower.split(/[\s\-_]+/), ...catLower.split(/[\s\-_]+/)].filter(t => t.length >= 3);

    // T1 — exact title match from API datasets
    if (productImages[nameLower]) return productImages[nameLower];

    // T2 — substring title match from API datasets
    const apiMatch = Object.entries(productImages).find(
      ([k]) => nameLower.includes(k) || k.includes(nameLower)
    )?.[1];
    if (apiMatch) return apiMatch;

    // T3a — exact keyword token in Unsplash map
    for (const token of tokens) {
      if (UNSPLASH_FALLBACKS[token]) return UNSPLASH_FALLBACKS[token];
    }

    // T3b — partial keyword token in Unsplash map
    for (const token of tokens) {
      const partial = Object.entries(UNSPLASH_FALLBACKS).find(
        ([k]) => !k.startsWith('_cat_') && k !== 'default' && (token.includes(k) || k.includes(token))
      )?.[1];
      if (partial) return partial;
    }

    // T3c — Category-respected default (explicit per-category fallback)
    if (/beverage|drink|juice|coffee/.test(catLower)) return UNSPLASH_FALLBACKS._cat_beverages;
    if (/bakery|bread|pastry|bake/.test(catLower))    return UNSPLASH_FALLBACKS._cat_bakery;
    if (/dessert|sweet|cake|candy/.test(catLower))    return UNSPLASH_FALLBACKS._cat_desserts;

    // T3d — Absolute guaranteed fallback
    return UNSPLASH_FALLBACKS.default;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productImages]);

  // ── Redirect if not logged in ──
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // ── Fetch active session ──
  const fetchSession = useCallback(async () => {
    try {
      const active = await api.get('/api/sessions/active');
      if (active) {
        setActiveSession(active);
        setShowSessionOpenModal(false);
      } else {
        setActiveSession(null);
        setShowSessionOpenModal(true);
      }
    } catch (err) {
      console.error('Failed to check active session', err);
      setShowSessionOpenModal(true);
    }
  }, []);

  // ── Fetch Catalog & Floors/Tables ──
  const fetchCatalogAndTables = useCallback(async () => {
    try {
      const [cats, prods, floorsData, tablesData] = await Promise.all([
        categoriesAPI.list(),
        productsAPI.list(),
        tablesAPI.floors(),
        tablesAPI.list(),
      ]);
      setCategories(cats || []);
      setProducts(prods || []);

      // Group tables by floor
      const mappedFloors = (floorsData || []).map(f => {
        const floorTables = (tablesData || [])
          .filter(t => t.floor_id === f.id)
          .map(t => ({
            id: t.id,
            number: t.table_number,
            seats: t.seats,
            status: t.status === 'available' ? 'free' : 'active'
          }));
        return {
          id: f.id,
          name: f.name,
          tables: floorTables
        };
      });
      setDbFloors(mappedFloors);
    } catch (err) {
      console.error('Failed to load catalog and tables', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role !== 'customer') {
        fetchSession();
      }
      fetchCatalogAndTables();
    }
  }, [user, fetchSession, fetchCatalogAndTables]);

  // ── Customer & Table Token auto-resolution ──
  useEffect(() => {
    if (user) {
      const queryParams = new URLSearchParams(window.location.search);
      const token = queryParams.get('token');
      if (token) {
        api.get(`/api/tables/verify-token/${token}`)
          .then(table => {
            dispatch({
              type: 'SET_TABLE',
              tableId: table.id,
              label: `${table.floor_name} · ${table.table_number}`
            });
          })
          .catch(err => {
            console.error('Failed to verify table token:', err);
          });
      }

      if (user.role === 'customer') {
        dispatch({
          type: 'SET_CUSTOMER',
          customerId: 'self',
          name: user.name
        });
      }
    }
  }, [user]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const catMap = useMemo(
    () => Object.fromEntries(categories.map(c => [c.id, c])),
    [categories]
  );

  const visibleProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(p => {
      const matchCat = activeCatId === null || p.category_id === activeCatId;
      const matchQ   = p.name.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeCatId, searchQuery, products]);

  const cartQtyMap = useMemo(
    () => Object.fromEntries(cart.items.map(i => [i.id, i.qty])),
    [cart.items]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddProduct = useCallback((product) => {
    const cat = catMap[product.category_id];
    dispatch({ type: 'ADD', product: { ...product, color: cat?.color } });
  }, [catMap]);

  const handleTableSelect = (table, floor) => {
    dispatch({ type: 'SET_TABLE', tableId: table.id, label: `${floor.name} · ${table.number}` });
    setShowTable(false);
  };

  const handleSendToKitchen = async () => {
    if (cart.items.length === 0 || sendState !== 'idle') return;
    setSendState('sending');
    try {
      await ordersAPI.create({
        session_id: activeSession?.id || 1,
        table_id: cart.tableId,
        customer_id: cart.customerId || null,
        coupon_code: cart.coupon?.coupon_code || null,
        items: cart.items.map(i => ({ product_id: i.id, quantity: i.qty }))
      });
      setSendState('sent');
      dispatch({ type: 'CLEAR' });
      fetchCatalogAndTables();
      setTimeout(() => setSendState('idle'), 2800);
    } catch (err) {
      console.error('Failed to send order', err);
      alert('Failed to send order: ' + (err.message || 'unknown error'));
      setSendState('idle');
    }
  };

  const handleProceedToPayment = async () => {
    if (cart.items.length === 0) return;
    try {
      const orderRes = await ordersAPI.create({
        session_id: activeSession?.id || 1,
        table_id: cart.tableId,
        customer_id: cart.customerId || null,
        coupon_code: cart.coupon?.coupon_code || null,
        items: cart.items.map(i => ({ product_id: i.id, quantity: i.qty }))
      });
      
      setPaymentOrder({
        id: orderRes.orderId || orderRes.order?.id,
        total_amount: orderRes.total || orderRes.order?.total_amount || cart.total,
        customer_id: cart.customerId,
        customerName: cart.customerName,
        tableLabel: cart.tableLabel,
        order_number: orderRes.order?.order_number
      });
      setShowPayment(true);
    } catch (err) {
      console.error('Failed to proceed to payment', err);
      alert('Failed to initialize payment: ' + (err.message || 'unknown error'));
    }
  };

  const handlePaymentSuccess = (paidOrder) => {
    dispatch({ type: 'CLEAR' });
    setPaymentOrder(null);
    setShowPayment(false);
    
    // Open receipt modal
    setReceiptOrder(paidOrder);
    setShowReceipt(true);
    
    // Re-fetch catalog tables status
    fetchCatalogAndTables();
  };

  // ── Keyboard shortcut: Escape to close modals ────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { 
        setShowTable(false); 
        setShowDiscount(false);
        setShowCustomers(false);
        setShowOrders(false);
        setShowPayment(false);
        setShowReceipt(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Sync to Customer Facing Display ─────────────────────────────────────────
  useEffect(() => {
    try {
      let displayState = 'CART';
      let amount = cart.total;
      
      if (showPayment) {
        displayState = 'PAYMENT';
        amount = paymentOrder?.total_amount || cart.total;
      } else if (showReceipt) {
        displayState = 'THANK_YOU';
        amount = receiptOrder?.total_amount || 0;
      }
      
      const payload = {
        state: displayState,
        cart: {
          items: cart.items.map(item => ({
            name: item.name,
            qty: item.qty,
            price: item.price,
          })),
          subtotal: cart.subtotal,
          tax: cart.tax,
          discount: cart.discount,
          total: amount
        }
      };
      
      // Save to localStorage for page-load sync
      localStorage.setItem('odoo_customer_display_state', JSON.stringify(payload));
      
      // Post message to BroadcastChannel
      const bc = new BroadcastChannel('odoo_customer_display');
      bc.postMessage(payload);
      bc.close();
    } catch (e) {
      console.warn('[Sync] Error synchronizing display:', e);
    }
  }, [cart, showPayment, paymentOrder, showReceipt, receiptOrder]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden select-none">

      {/* ══════════════════════════════════════════════════════════════════════
          TOP NAV BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 z-20">

        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Icons.Coffee />
          </div>
          <span className="text-white font-extrabold text-sm hidden sm:block tracking-tight">Odoo Cafe</span>
        </div>

        {/* Nav pills */}
        <nav className="flex items-center gap-1">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
            POS Order
          </span>
          {user?.role !== 'customer' && (
            <button
              id="nav-table-view"
              onClick={() => setShowTable(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              <Icons.Table /> Table View
            </button>
          )}
          <button
            id="nav-orders-btn"
            onClick={() => setShowOrders(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            📜 Orders
          </button>
          {user?.role !== 'customer' && (
            <button
              id="nav-customers-btn"
              onClick={() => setShowCustomers(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              👥 Customers
            </button>
          )}
        </nav>

        {/* ml-auto spacer — pushes table badge + user menu to the right */}
        <div className="flex-1" />

        {/* Table badge */}
        {cart.tableLabel && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
            <Icons.Table />
            <span className="text-amber-400 text-xs font-semibold">{cart.tableLabel}</span>
          </div>
        )}

        {/* User Dropdown Menu */}
        <div className="relative">
          <button
            id="nav-user-menu"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="ml-1 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md hover:scale-105 transition-transform"
          >
            <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || 'C'}</span>
          </button>
          
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-800">
                <p className="text-white font-semibold text-sm truncate">{user?.name}</p>
                <p className="text-gray-500 text-xs truncate capitalize">{user?.role}</p>
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/admin'); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  ⚙️ Admin Dashboard
                </button>
              )}
              {user?.role !== 'customer' && (
                <button
                  onClick={() => { setShowUserMenu(false); setShowSessionCloseModal(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  🔒 Close Shift / Session
                </button>
              )}
              <button
                onClick={() => { setShowUserMenu(false); logout(); navigate('/login'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                🚪 Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY — SPLIT LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════════════════════════════════════════════════════════════════════
            LEFT PANEL — PRODUCT CATALOG
        ════════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Category Filter Tabs ───────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-gray-900/50 border-b border-gray-800 px-4 pt-3 pb-0 flex items-center gap-2 overflow-x-auto">
            {/* All Items tab */}
            <button
              id="cat-tab-all"
              onClick={() => setActiveCatId(null)}
              className={[
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all border',
                activeCatId === null
                  ? 'bg-gray-100 text-gray-900 border-transparent shadow-md'
                  : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600',
              ].join(' ')}
            >
              All Items ({products.length})
            </button>

            {categories.map(cat => (
              <CategoryTab
                key={cat.id}
                cat={cat}
                isActive={activeCatId === cat.id}
                onClick={() => setActiveCatId(activeCatId === cat.id ? null : cat.id)}
              />
            ))}
          </div>

          {/* ── Inline Search Bar (below category tabs) ────────────────────── */}
          <div className="flex-shrink-0 bg-gray-900/30 border-b border-gray-800/60 px-4 py-2.5">
            <div className="relative max-w-full">
              {/* Search icon */}
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                <Icons.Search />
              </div>
              <input
                id="product-search"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search menu items… (Cappuccino, Muffin, Cake…)"
                className={[
                  'w-full bg-gray-800/80 border text-white text-sm rounded-xl',
                  'pl-10 pr-10 py-2.5 transition-all duration-200 placeholder-gray-600',
                  searchQuery
                    ? 'border-amber-500/70 bg-gray-800 shadow-lg shadow-amber-500/10'
                    : 'border-gray-700/80 focus:border-amber-500/70 focus:bg-gray-800 focus:shadow-lg focus:shadow-amber-500/10',
                  'focus:outline-none',
                ].join(' ')}
              />
              {/* Clear button — only visible when query is non-empty */}
              {searchQuery && (
                <button
                  id="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Product Grid ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4">
            {visibleProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-600 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/60 flex items-center justify-center">
                  <Icons.Search />
                </div>
                <p className="text-sm font-medium">No products match "{searchQuery}"</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: '14px',
                }}
              >
                {visibleProducts.map(product => {
                  const catName   = catMap[product.category_id]?.name || '';
                  const heroImage = resolveProductImage(product, catName);

                  // Category-respected safe fallback for onError in ProductCard
                  const catLow = catName.toLowerCase();
                  const fallbackImage =
                    /beverage|drink|juice|coffee/.test(catLow)
                      ? UNSPLASH_FALLBACKS._cat_beverages
                      : /bakery|bread|pastry|bake/.test(catLow)
                        ? UNSPLASH_FALLBACKS._cat_bakery
                        : /dessert|sweet|cake|candy/.test(catLow)
                          ? UNSPLASH_FALLBACKS._cat_desserts
                          : UNSPLASH_FALLBACKS.default;

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      color={catMap[product.category_id]?.color || '#6366f1'}
                      cartQty={cartQtyMap[product.id] || 0}
                      onAdd={handleAddProduct}
                      coffeeImage={heroImage}
                      fallbackImage={fallbackImage}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT PANEL — CART + ORDER SUMMARY
        ════════════════════════════════════════════════════════════════════ */}
        <div
          id="cart-panel"
          className="w-80 xl:w-96 flex-shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col"
        >

          {/* ── Cart Header ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Icons.Receipt /> Current Order
              </h2>
              {cart.tableLabel
                ? <p className="text-amber-400 text-xs mt-0.5 font-medium">{cart.tableLabel}</p>
                : <p className="text-gray-600 text-xs mt-0.5">No table selected</p>
              }
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs">{cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</span>
              {cart.items.length > 0 && (
                <button
                  id="clear-cart-btn"
                  onClick={() => dispatch({ type: 'CLEAR' })}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Cart Item Rows ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {cart.items.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/60 flex items-center justify-center">
                  <Icons.Coffee />
                </div>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs text-gray-700">Tap a product to add it</p>
              </div>
            ) : (
              cart.items.map(item => (
                <CartRow
                  key={item.id}
                  item={item}
                  onQty={(id, qty) => dispatch({ type: 'SET_QTY', id, qty })}
                  onRemove={(id) => dispatch({ type: 'REMOVE', id })}
                />
              ))
            )}
          </div>

          {/* Linked Customer Info */}
          {cart.customerName && (
            <div className="flex-shrink-0 px-5 py-2 border-t border-gray-800 flex items-center justify-between text-xs text-emerald-400 bg-emerald-500/5">
              <span className="truncate flex items-center gap-1.5 font-medium">
                👤 Customer: <span className="font-semibold text-white">{cart.customerName}</span>
              </span>
              {user?.role !== 'customer' && (
                <button
                  id="remove-customer-btn"
                  onClick={() => dispatch({ type: 'SET_CUSTOMER', customerId: null, name: '' })}
                  className="text-red-400 hover:text-red-300 font-bold px-1.5"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* ── Primary Action Buttons ───────────────────────────────────────── */}
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-800 flex gap-2">
            {user?.role !== 'customer' && (
              <button
                id="table-view-btn"
                onClick={() => setShowTable(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold border border-gray-700 hover:border-gray-500 transition-all"
              >
                <Icons.Table /> Table
              </button>
            )}
            <button
              id="discount-btn"
              onClick={() => setShowDiscount(true)}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                cart.coupon
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700 hover:border-gray-500',
              ].join(' ')}
            >
              <Icons.Tag /> {cart.coupon ? cart.coupon.code : 'Discount'}
            </button>
          </div>

          {/* ── Order Summary Block ──────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-800 space-y-2.5">
            {/* Subtotal row */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white font-medium">{fmt(cart.subtotal)}</span>
            </div>
            {/* Tax row */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">GST / Tax</span>
              <span className="text-white font-medium">{fmt(cart.tax)}</span>
            </div>
            {/* Discount row (only shown when active) */}
            {cart.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-400">
                  Discount {cart.coupon ? `(${cart.coupon.code})` : ''}
                </span>
                <span className="text-emerald-400 font-medium">−{fmt(cart.discount)}</span>
              </div>
            )}
            {/* Divider */}
            <div className="border-t border-gray-700 pt-2.5 flex items-center justify-between">
              <span className="text-white font-bold text-base">Total</span>
              <span className="text-amber-400 font-extrabold text-xl tabular-nums">{fmt(cart.total)}</span>
            </div>
          </div>

          {/* ── Send to Kitchen CTA ──────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-5 pb-5 space-y-2.5">
            <button
              id="send-to-kitchen-btn"
              onClick={handleSendToKitchen}
              disabled={cart.items.length === 0 || sendState !== 'idle'}
              className={[
                'w-full py-4 rounded-2xl font-bold text-sm tracking-wide',
                'flex items-center justify-center gap-2.5 transition-all duration-200',
                sendState === 'sent'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : cart.items.length > 0 && sendState === 'idle'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.99]'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700',
              ].join(' ')}
            >
              {sendState === 'sent' ? (
                <><Icons.Check /> Order Sent to Kitchen!</>
              ) : sendState === 'sending' ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-900/40 border-t-gray-900 rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <><Icons.Send /> Send to Kitchen</>
              )}
            </button>

            {/* Proceed to Payment (secondary) */}
            {cart.items.length > 0 && (
              <button
                id="proceed-payment-btn"
                onClick={handleProceedToPayment}
                className="w-full py-3 rounded-2xl font-semibold text-sm bg-gray-800/70 hover:bg-gray-700 text-white border border-gray-700 hover:border-gray-500 transition-all flex items-center justify-center gap-2"
              >
                Proceed to Payment →
              </button>
            )}
          </div>
        </div>
      </div>

      {showTable && (
        <TableModal
          floors={dbFloors}
          onSelect={handleTableSelect}
          onClose={() => setShowTable(false)}
        />
      )}

      {showDiscount && (
        <DiscountModal
          activeCoupon={cart.coupon}
          onApply={(coupon) => dispatch({ type: 'APPLY_COUPON', coupon })}
          onRemove={() => dispatch({ type: 'REMOVE_COUPON' })}
          onClose={() => setShowDiscount(false)}
        />
      )}

      {showCustomers && (
        <CustomersModal
          onSelect={(c) => { dispatch({ type: 'SET_CUSTOMER', customerId: c.id, name: c.name }); setShowCustomers(false); }}
          onClose={() => setShowCustomers(false)}
        />
      )}

      {showOrders && (
        <OrdersModal
          onPay={(order) => {
            setPaymentOrder({
              id: order.id,
              total_amount: order.total_amount,
              customer_id: order.customer_id,
              customerName: order.customer_name || '',
              tableLabel: order.table_label || `Order #${order.id}`,
              order_number: order.order_number
            });
            setShowOrders(false);
            setShowPayment(true);
          }}
          onClose={() => setShowOrders(false)}
        />
      )}

      {showPayment && paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {showReceipt && receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => { setShowReceipt(false); setReceiptOrder(null); }}
        />
      )}

      {showSessionOpenModal && user?.role !== 'customer' && (
        <SessionOpenModal
          user={user}
          onSuccess={(session) => {
            setActiveSession(session);
            setShowSessionOpenModal(false);
          }}
        />
      )}

      {showSessionCloseModal && activeSession && (
        <SessionCloseModal
          session={activeSession}
          onSuccess={() => {
            setActiveSession(null);
            setShowSessionCloseModal(false);
            logout();
            navigate('/login');
          }}
          onClose={() => setShowSessionCloseModal(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW SHIFT, CUSTOMER, ORDERS & PAYMENT SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function SessionOpenModal({ user, onSuccess }) {
  const [openingBalance, setOpeningBalance] = useState('1000.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = async () => {
    const bal = parseFloat(openingBalance);
    if (isNaN(bal) || bal < 0) {
      setError('Please enter a valid opening balance.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/sessions', {
        user_id: user.id,
        opening_balance: bal
      });
      onSuccess(res);
    } catch (err) {
      setError(err.message || 'Failed to open session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-md p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center text-3xl mx-auto">
          🔓
        </div>
        <div>
          <h2 className="text-white font-extrabold text-2xl">Open POS Shift / Session</h2>
          <p className="text-gray-400 text-sm mt-1.5">
            Welcome back, {user?.name}. Please enter your opening cash balance to start.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 text-left">
            {error}
          </div>
        )}

        <div className="space-y-2 text-left">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Opening Cash (₹)</label>
          <input
            type="number"
            value={openingBalance}
            onChange={e => setOpeningBalance(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-5 py-4 font-bold text-lg focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <button
          onClick={handleOpen}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? 'Opening Shift...' : 'Open Shift & Start Selling'}
        </button>
      </div>
    </div>
  );
}

function SessionCloseModal({ session, onSuccess, onClose }) {
  const [summary, setSummary] = useState(null);
  const [closingBalance, setClosingBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await api.get(`/api/sessions/${session.id}/summary`);
        setSummary(res);
        setClosingBalance(res.expected_closing_cash.toFixed(2));
      } catch (err) {
        setError('Failed to fetch session summary: ' + err.message);
      }
    }
    loadSummary();
  }, [session.id]);

  const handleClose = async () => {
    const bal = parseFloat(closingBalance);
    if (isNaN(bal) || bal < 0) {
      setError('Please enter a valid closing balance.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.put(`/api/sessions/${session.id}/close`, {
        closing_balance: bal
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to close session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            🔒 Close Session & Shift Summary
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <Icons.X />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {summary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/40 border border-gray-800 p-4 rounded-2xl">
                  <p className="text-gray-500 text-xs">Opening Cash Balance</p>
                  <p className="text-white font-extrabold text-xl mt-1">{fmt(summary.opening_balance)}</p>
                </div>
                <div className="bg-gray-800/40 border border-gray-800 p-4 rounded-2xl">
                  <p className="text-gray-500 text-xs">Total Sales (All Types)</p>
                  <p className="text-amber-400 font-extrabold text-xl mt-1">{fmt(summary.total_sales)}</p>
                </div>
              </div>

              {/* Payment details list */}
              <div className="bg-gray-950 rounded-2xl p-4 border border-gray-800 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Cash Sales (+ expected in drawer)</span>
                  <span className="text-white font-semibold">{fmt(summary.cash_sales)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Card Sales</span>
                  <span className="text-white font-semibold">{fmt(summary.card_sales)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>UPI QR Sales</span>
                  <span className="text-white font-semibold">{fmt(summary.upi_sales)}</span>
                </div>
                <div className="border-t border-gray-800 pt-2.5 flex justify-between font-bold text-white">
                  <span>Expected Closing Cash</span>
                  <span className="text-amber-400">{fmt(summary.expected_closing_cash)}</span>
                </div>
              </div>

              {/* Input for actual cash */}
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Actual Closing Cash in Drawer (₹)</label>
                <input
                  type="number"
                  value={closingBalance}
                  onChange={e => setClosingBalance(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-5 py-4 font-bold text-lg focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {closingBalance !== '' && (
                <div className="flex items-center justify-between text-sm px-4 py-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-400">Drawer Discrepancy:</span>
                  <span className={`font-extrabold ${parseFloat(closingBalance) - summary.expected_closing_cash >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(parseFloat(closingBalance) - summary.expected_closing_cash)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Loading shift details...
            </div>
          )}

          <button
            onClick={handleClose}
            disabled={loading || !summary}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold rounded-2xl shadow-lg shadow-red-500/10 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Closing Shift...' : 'Close Session & Log Out'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomersModal({ onSelect, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const loadCustomers = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const res = await customersAPI.list(query);
      setCustomers(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = (val) => {
    setSearch(val);
    loadCustomers(val);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name) { setError('Name is required.'); return; }
    setError('');
    try {
      await customersAPI.create({ name, email, phone });
      loadCustomers(search);
      setName('');
      setEmail('');
      setPhone('');
      setFormOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save customer.');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this customer?')) return;
    try {
      await customersAPI.delete(id);
      loadCustomers(search);
    } catch (err) {
      alert(err.message || 'Failed to delete.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              👥 Customers Directory
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Manage customers and link them to orders</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs font-bold rounded-xl transition-colors"
            >
              {formOpen ? 'Cancel' : '+ Add Customer'}
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Icons.X />
            </button>
          </div>
        </div>

        {/* Add/Edit Form Overlay */}
        {formOpen && (
          <form onSubmit={handleSave} className="bg-gray-950 p-6 border-b border-gray-800 space-y-4 flex-shrink-0">
            <h3 className="text-white font-bold text-sm">Add New Customer</h3>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Full Name (Required)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl transition-colors">
              Save Customer Details
            </button>
          </form>
        )}

        {/* Search Input */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, email, or phone number..."
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors placeholder-gray-600"
          />
        </div>

        {/* Customers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Searching customers...</div>
          ) : customers.length > 0 ? (
            customers.map(c => (
              <div
                key={c.id}
                onClick={() => onSelect(c)}
                className="flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-2xl cursor-pointer transition-all group"
              >
                <div>
                  <h4 className="text-white font-semibold text-sm">{c.name}</h4>
                  <div className="flex gap-4 text-gray-400 text-xs mt-1">
                    {c.email && <span>📧 {c.email}</span>}
                    {c.phone && <span>📞 {c.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-amber-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Link Order →
                  </span>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="text-gray-600 hover:text-red-400 p-1.5 transition-colors"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">No customers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersModal({ onPay, onClose }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.list();
      setOrders(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const s = search.toLowerCase().trim();
    return orders.filter(o => {
      const matchNum = !s || (o.order_number || '').toLowerCase().includes(s) || o.id.toString().includes(s);
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchNum && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const handleCancelOrder = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await ordersAPI.cancel(id);
      loadOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert('Failed to cancel order: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[80vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Left Side: Order List */}
        <div className="w-full md:w-1/2 border-r border-gray-800 flex flex-col h-full overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-800 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              {user?.role === 'customer' ? '📜 My Orders' : '📜 Active Shift Orders'}
            </h2>
            <button onClick={onClose} className="md:hidden w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Icons.X />
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-800 space-y-2 flex-shrink-0 bg-gray-950/20">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by order number..."
              className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-colors placeholder-gray-650 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === '' ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === 'draft' ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-400'}`}
              >
                Draft
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === 'pending' ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-400'}`}
              >
                Kitchen
              </button>
            </div>
          </div>

          {/* Orders Scroll Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Retrieving active orders...</div>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map(o => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all ${selectedOrder?.id === o.id ? 'border-amber-500 bg-amber-500/5' : 'border-gray-800 bg-gray-800/30 hover:bg-gray-800/60'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold font-mono text-sm">{o.order_number || `Order #${o.id}`}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      o.status === 'draft'
                        ? 'bg-gray-700 text-gray-300'
                        : o.status === 'pending'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : o.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {o.status === 'draft'
                        ? 'Draft'
                        : o.status === 'pending'
                          ? 'KDS Pending'
                          : o.status === 'paid'
                            ? 'Paid'
                            : 'Cancelled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                    <span>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-amber-400 font-bold">{fmt(o.total_amount)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No active orders.</div>
            )}
          </div>
        </div>

        {/* Right Side: Details View */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-950/40">
          <div className="px-6 py-5 border-b border-gray-800 flex-shrink-0 flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">Order Details</h3>
            <button onClick={onClose} className="hidden md:flex w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Icons.X />
            </button>
          </div>

          {selectedOrder ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="space-y-1">
                  <p className="text-white font-black font-mono text-xl">{selectedOrder.order_number || `Order #${selectedOrder.id}`}</p>
                  <p className="text-gray-500 text-xs">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>

                {/* Items detail list */}
                <div className="space-y-2 border-t border-b border-gray-800 py-4">
                  {(selectedOrder.items || []).map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm text-gray-300">
                      <div>
                        <span className="font-semibold text-white">{item.product_name}</span>
                        <span className="text-gray-500 text-xs ml-2">×{item.quantity}</span>
                      </div>
                      <span className="font-mono text-amber-400">{fmt(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals details */}
                <div className="space-y-1.5 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-white font-medium">{fmt(selectedOrder.subtotal)}</span>
                  </div>
                  {parseFloat(selectedOrder.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span>−{fmt(selectedOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST / Tax</span>
                    <span className="text-white font-medium">{fmt(selectedOrder.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white text-base border-t border-gray-800 pt-3 mt-2">
                    <span>Grand Total</span>
                    <span className="text-amber-400 font-extrabold">{fmt(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Action pane footer */}
              {selectedOrder.status !== 'paid' && selectedOrder.status !== 'cancelled' && (
                <div className="p-6 border-t border-gray-800 bg-gray-900 flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => onPay(selectedOrder)}
                    className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-xs font-semibold"
                  >
                    💳 Proceed to Pay
                  </button>
                  {(user?.role !== 'customer' || selectedOrder.status === 'draft') && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="px-5 py-3.5 bg-gray-800 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/25 font-semibold rounded-2xl transition-colors text-xs"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
              <span className="text-4xl mb-2">👈</span>
              <p className="font-semibold text-sm">Select an active order from the list to manage.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ order, onSuccess, onClose }) {
  const [method, setMethod] = useState('cash'); // 'cash' | 'card' | 'upi'
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enabledMethods, setEnabledMethods] = useState([]);

  useEffect(() => {
    async function loadMethods() {
      try {
        const res = await api.get('/api/payment-methods');
        const active = (res || []).filter(pm => pm.is_enabled);
        setEnabledMethods(active);
        if (active.length > 0) {
          setMethod(active[0].type);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMethods();
  }, []);

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const pmObj = enabledMethods.find(pm => pm.type === method) || { name: method };
      await ordersAPI.pay(order.id, {
        payment_method: pmObj.name,
        payment_ref: ref || null,
        customer_id: order.customer_id || null
      });
      
      onSuccess({
        ...order,
        payment_method: pmObj.name,
        payment_ref: ref || 'PAID',
        status: 'paid',
        paid_at: new Date().toLocaleString()
      });
    } catch (err) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectedMethodObj = enabledMethods.find(pm => pm.type === method);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            💳 Process Order Payment
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <Icons.X />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Amount Box */}
          <div className="bg-gray-950 border border-gray-850 p-6 rounded-2xl text-center space-y-1">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Amount Due</p>
            <p className="text-amber-400 font-black text-3xl tabular-nums">{fmt(order.total_amount)}</p>
            {order.order_number && <p className="text-gray-600 font-mono text-[10px] pt-1">{order.order_number}</p>}
          </div>

          {/* Select Method */}
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Select Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {enabledMethods.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => { setMethod(pm.type); setRef(''); }}
                  className={`p-4 border rounded-2xl text-center transition-all ${method === pm.type ? 'border-amber-500 bg-amber-500/10 text-white font-bold' : 'border-gray-800 bg-gray-800/30 text-gray-400 hover:text-white'}`}
                >
                  <span className="text-2xl block mb-1">
                    {pm.type === 'cash' ? '💵' : pm.type === 'card' ? '💳' : '📱'}
                  </span>
                  <span className="text-[10px] leading-tight block">{pm.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic details for UPI / Card / Cash */}
          {method === 'upi' && (
            <div className="bg-gray-950 border border-gray-850 p-4 rounded-2xl text-center space-y-3 animate-in fade-in duration-200">
              <p className="text-xs text-gray-400">Scan to Pay via UPI App</p>
              <div className="w-32 h-32 bg-white p-2.5 rounded-xl mx-auto shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-md relative flex flex-wrap p-0.5 overflow-hidden">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-[8.33%] h-[8.33%] ${(i % 3 === 0 || i % 7 === 2 || (i > 10 && i < 20) || (i > 80 && i < 110)) ? 'bg-amber-400' : 'bg-slate-950'}`}
                    />
                  ))}
                  <div className="absolute top-1 left-1 w-6 h-6 bg-slate-950 border-[3px] border-amber-400 rounded flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-amber-400" />
                  </div>
                  <div className="absolute top-1 right-1 w-6 h-6 bg-slate-950 border-[3px] border-amber-400 rounded flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-amber-400" />
                  </div>
                  <div className="absolute bottom-1 left-1 w-6 h-6 bg-slate-950 border-[3px] border-amber-400 rounded flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-amber-400" />
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-mono text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full inline-block">
                Merchant UPI: {selectedMethodObj?.upi_id || 'cafe@upi'}
              </p>
            </div>
          )}

          {/* Reference ID Input */}
          {method !== 'cash' && (
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Transaction Reference / Approval Code</label>
              <input
                type="text"
                placeholder="Enter Transaction Ref Number..."
                value={ref}
                onChange={e => setRef(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-bold rounded-2xl shadow-lg shadow-amber-500/15 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-50 text-sm"
          >
            {loading ? 'Processing Payment...' : 'Confirm & Validate Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ order, onClose }) {
  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Receipt Body */}
        <div id="receipt-print-area" className="flex-1 overflow-y-auto p-8 bg-white text-slate-800 text-xs font-mono space-y-4 selection:bg-slate-200">
          <div className="text-center space-y-1">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">☕ Odoo Cafe POS</h2>
            <p className="text-[10px] text-slate-500">123 Cafe Street, Rooftop</p>
            <p className="text-[10px] text-slate-500">GSTIN: 27AAAAA1111A1Z1</p>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-3 space-y-1 text-[10px] text-slate-500">
            <div className="flex justify-between">
              <span>Receipt No:</span>
              <span className="font-bold text-slate-700">{order.order_number || `ORD-${order.id}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Date/Time:</span>
              <span>{order.paid_at || new Date().toLocaleString()}</span>
            </div>
            {order.tableLabel && (
              <div className="flex justify-between">
                <span>Table:</span>
                <span className="font-bold text-slate-700">{order.tableLabel}</span>
              </div>
            )}
            {order.customerName && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold text-slate-700">{order.customerName}</span>
              </div>
            )}
          </div>

          <table className="w-full border-t border-b border-dashed border-slate-300 py-3 text-[10px]">
            <thead>
              <tr className="text-slate-600 font-bold text-left">
                <th className="pb-2">Item Description</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map(item => (
                  <tr key={item.id} className="text-slate-700">
                    <td className="py-1 max-w-[120px] truncate">{item.product_name}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{item.price ? fmt(item.price).replace('₹','') : fmt(item.unit_price).replace('₹','')}</td>
                    <td className="py-1 text-right">{fmt(item.subtotal).replace('₹','')}</td>
                  </tr>
                ))
              ) : (
                <tr className="text-slate-500 italic">
                  <td colSpan="4" className="text-center py-2">Items already dispatched.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="space-y-1 text-right text-[10px]">
            {order.subtotal && (
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{fmt(order.subtotal)}</span>
              </div>
            )}
            {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-655 font-semibold">
                <span>Coupon Discount:</span>
                <span>−{fmt(order.discount_amount)}</span>
              </div>
            )}
            {order.tax_amount && (
              <div className="flex justify-between text-slate-500">
                <span>GST/CGST/SGST:</span>
                <span>{fmt(order.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Paid:</span>
              <span>{fmt(order.total_amount)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-4 text-center space-y-1 text-[9px] text-slate-500">
            <p className="font-bold text-slate-700">Payment: {order.payment_method || 'Cash'}</p>
            {order.payment_ref && <p className="font-mono text-[8px]">Ref: {order.payment_ref}</p>}
            <p className="pt-2 text-[10px] font-bold text-slate-600">Thank you for visiting! 😊</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gray-800 bg-gray-900 flex gap-2">
          <button
            onClick={printReceipt}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-2xl transition-all font-semibold text-xs"
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-all text-xs"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}
