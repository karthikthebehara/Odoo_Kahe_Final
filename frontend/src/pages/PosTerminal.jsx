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
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  { id: 1, name: 'Coffee & Hot Drinks', color: '#c2683a' },
  { id: 2, name: 'Cold Beverages',      color: '#3b82f6' },
  { id: 3, name: 'Snacks & Starters',   color: '#f59e0b' },
  { id: 4, name: 'Main Course',         color: '#ef4444' },
  { id: 5, name: 'Desserts',            color: '#ec4899' },
  { id: 6, name: 'Breads & Bakery',     color: '#84cc16' },
];

const PRODUCTS = [
  { id:  1, category_id: 1, name: 'Espresso',             price:  80, tax: 5, uom: 'cup'   },
  { id:  2, category_id: 1, name: 'Cappuccino',           price: 120, tax: 5, uom: 'cup'   },
  { id:  3, category_id: 1, name: 'Latte',                price: 130, tax: 5, uom: 'cup'   },
  { id:  4, category_id: 1, name: 'Masala Chai',          price:  60, tax: 5, uom: 'cup'   },
  { id:  5, category_id: 1, name: 'Hot Chocolate',        price: 110, tax: 5, uom: 'cup'   },
  { id:  6, category_id: 2, name: 'Cold Coffee',          price: 140, tax: 5, uom: 'cup'   },
  { id:  7, category_id: 2, name: 'Mango Smoothie',       price: 120, tax: 5, uom: 'cup'   },
  { id:  8, category_id: 2, name: 'Fresh Lime Soda',      price:  80, tax: 5, uom: 'cup'   },
  { id:  9, category_id: 2, name: 'Iced Tea',             price:  90, tax: 5, uom: 'cup'   },
  { id: 10, category_id: 3, name: 'Veg Sandwich',         price: 100, tax: 5, uom: 'piece' },
  { id: 11, category_id: 3, name: 'Paneer Tikka',         price: 180, tax: 5, uom: 'plate' },
  { id: 12, category_id: 3, name: 'French Fries',         price:  90, tax: 5, uom: 'plate' },
  { id: 13, category_id: 4, name: 'Dal Makhani',          price: 200, tax: 5, uom: 'plate' },
  { id: 14, category_id: 4, name: 'Paneer Butter Masala', price: 220, tax: 5, uom: 'plate' },
  { id: 15, category_id: 4, name: 'Veg Biryani',          price: 180, tax: 5, uom: 'plate' },
  { id: 16, category_id: 5, name: 'Chocolate Brownie',    price: 110, tax: 5, uom: 'piece' },
  { id: 17, category_id: 5, name: 'Gulab Jamun',          price:  80, tax: 5, uom: 'plate' },
  { id: 18, category_id: 5, name: 'Cheesecake',           price: 150, tax: 5, uom: 'piece' },
  { id: 19, category_id: 6, name: 'Butter Croissant',     price:  80, tax: 5, uom: 'piece' },
  { id: 20, category_id: 6, name: 'Garlic Bread',         price:  90, tax: 5, uom: 'plate' },
  { id: 21, category_id: 6, name: 'Cinnamon Roll',        price: 100, tax: 5, uom: 'piece' },
  { id: 22, category_id: 3, name: 'Nachos & Salsa',       price: 130, tax: 5, uom: 'plate' },
];

const FLOORS = [
  {
    id: 1, name: 'Ground Floor',
    tables: [
      { id: 1,  number: 'T1',  seats: 2, status: 'free'   },
      { id: 2,  number: 'T2',  seats: 4, status: 'active' },
      { id: 3,  number: 'T3',  seats: 4, status: 'free'   },
      { id: 4,  number: 'T4',  seats: 6, status: 'active' },
      { id: 5,  number: 'T5',  seats: 2, status: 'free'   },
      { id: 6,  number: 'T6',  seats: 4, status: 'free'   },
    ],
  },
  {
    id: 2, name: 'First Floor',
    tables: [
      { id: 7,  number: 'T7',  seats: 4, status: 'free'   },
      { id: 8,  number: 'T8',  seats: 6, status: 'active' },
      { id: 9,  number: 'T9',  seats: 8, status: 'free'   },
      { id: 10, number: 'T10', seats: 2, status: 'free'   },
    ],
  },
  {
    id: 3, name: 'Terrace',
    tables: [
      { id: 11, number: 'T11', seats: 4, status: 'free'   },
      { id: 12, number: 'T12', seats: 4, status: 'active' },
      { id: 13, number: 'T13', seats: 6, status: 'free'   },
    ],
  },
];

const COUPONS = {
  WELCOME10: { code: 'WELCOME10', type: 'percent', value: 10, label: '10% off' },
  FLAT50:    { code: 'FLAT50',    type: 'fixed',   value: 50, label: '₹50 off' },
  SAVE20:    { code: 'SAVE20',    type: 'percent', value: 20, label: '20% off' },
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
function ProductCard({ product, color, cartQty, onAdd }) {
  return (
    <button
      id={`product-card-${product.id}`}
      onClick={() => onAdd(product)}
      className={[
        'group relative bg-gray-800/70 hover:bg-gray-700/80',
        'border border-gray-700/60 hover:border-gray-500',
        'rounded-2xl p-4 text-left transition-all duration-200',
        'hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0',
        'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
      ].join(' ')}
    >
      {/* Category color strip */}
      <div
        className="absolute top-0 inset-x-0 h-[3px] rounded-t-2xl"
        style={{ backgroundColor: color }}
      />

      {/* Cart badge */}
      {cartQty > 0 && (
        <div
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md"
          style={{ backgroundColor: color }}
        >
          {cartQty}
        </div>
      )}

      <div className="mt-1 space-y-2">
        <p className="text-white font-semibold text-sm leading-tight line-clamp-2 pr-6">
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

      {/* Hover add pill */}
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
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Icons.Table /> Select a Table
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {floor.tables.filter(t => t.status === 'free').length} tables available on {floor.name}
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
        <div className="flex gap-2 px-6 pt-5">
          {floors.map(f => (
            <button
              key={f.id}
              id={`floor-tab-${f.id}`}
              onClick={() => setActiveFloorId(f.id)}
              className={[
                'px-5 py-2 rounded-xl text-sm font-semibold transition-all',
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
        <div className="p-6 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {(floor?.tables || []).map(t => {
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
          })}
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

  const validate = () => {
    const c = code.trim().toUpperCase();
    if (!c) { setError('Please enter a coupon code.'); return; }
    const found = COUPONS[c];
    if (!found) {
      setError(`"${c}" is not a valid coupon.`);
      setResult(null);
    } else {
      setError('');
      setResult(found);
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
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-md p-6"
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
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Icons.Check />
              <span className="font-semibold text-sm">{activeCoupon.code} — {activeCoupon.label}</span>
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
  // ── Local State ─────────────────────────────────────────────────────────────
  const [cart, dispatch]       = useReducer(cartReducer, cartInit);

  const [activeCatId, setActiveCatId]   = useState(null); // null = All
  const [searchQuery, setSearchQuery]   = useState('');
  const [showTable,   setShowTable]     = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [sendState,   setSendState]     = useState('idle'); // 'idle' | 'sending' | 'sent'

  // ── Derived data ─────────────────────────────────────────────────────────────
  const catMap = useMemo(
    () => Object.fromEntries(CATEGORIES.map(c => [c.id, c])),
    []
  );

  const visibleProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return PRODUCTS.filter(p => {
      const matchCat = activeCatId === null || p.category_id === activeCatId;
      const matchQ   = p.name.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeCatId, searchQuery]);

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
    // Simulate async API call
    await new Promise(r => setTimeout(r, 900));
    setSendState('sent');
    setTimeout(() => setSendState('idle'), 2800);
  };

  // ── Keyboard shortcut: Escape to close modals ────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setShowTable(false); setShowDiscount(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
          <button
            id="nav-table-view"
            onClick={() => setShowTable(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            <Icons.Table /> Table View
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            Orders
          </button>
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-xs ml-auto relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <Icons.Search />
          </div>
          <input
            id="product-search"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-amber-500 transition-colors placeholder-gray-600"
          />
        </div>

        {/* Table badge */}
        {cart.tableLabel && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
            <Icons.Table />
            <span className="text-amber-400 text-xs font-semibold">{cart.tableLabel}</span>
          </div>
        )}

        {/* Session indicator */}
        <div className="ml-1 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md">
          <span className="text-white text-xs font-bold">C</span>
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
          <div className="flex-shrink-0 bg-gray-900/50 border-b border-gray-800 px-4 py-3 flex items-center gap-2 overflow-x-auto">
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
              All Items ({PRODUCTS.length})
            </button>

            {CATEGORIES.map(cat => (
              <CategoryTab
                key={cat.id}
                cat={cat}
                isActive={activeCatId === cat.id}
                onClick={() => setActiveCatId(activeCatId === cat.id ? null : cat.id)}
              />
            ))}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {visibleProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    color={catMap[product.category_id]?.color || '#6366f1'}
                    cartQty={cartQtyMap[product.id] || 0}
                    onAdd={handleAddProduct}
                  />
                ))}
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

          {/* ── Primary Action Buttons ───────────────────────────────────────── */}
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-800 flex gap-2">
            <button
              id="table-view-btn"
              onClick={() => setShowTable(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold border border-gray-700 hover:border-gray-500 transition-all"
            >
              <Icons.Table /> Table
            </button>
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
                className="w-full py-3 rounded-2xl font-semibold text-sm bg-gray-800/70 hover:bg-gray-700 text-white border border-gray-700 hover:border-gray-500 transition-all flex items-center justify-center gap-2"
              >
                Proceed to Payment →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}
      {showTable && (
        <TableModal
          floors={FLOORS}
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
    </div>
  );
}
