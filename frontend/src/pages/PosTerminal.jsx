/**
 * frontend/src/pages/PosTerminal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full POS operational screen.
 *
 * Layout (3-column grid):
 *   LEFT  → Category filter tabs + Product card grid
 *   RIGHT → Cart panel (line items + order summary + action buttons)
 *
 * Sub-features:
 *   • Floor Pop-up modal (table selection per floor)
 *   • Discount / Coupon popup
 *   • Real-time totals recomputed via CartContext reducer
 *   • Send to Kitchen action
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { productsAPI, categoriesAPI, tablesAPI, ordersAPI, couponsAPI } from '../utils/api';

// ═══════════════════════════════════════════════════════════════════════════════
// Utility: format currency
// ═══════════════════════════════════════════════════════════════════════════════
const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

// ═══════════════════════════════════════════════════════════════════════════════
// Inline SVG Icons
// ═══════════════════════════════════════════════════════════════════════════════
const Icon = {
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Minus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  ),
  Table: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  ),
  Tag: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Send: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Coffee: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17 8h1a4 4 0 010 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/>
    </svg>
  ),
  Menu: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA  (used when API is not yet available)
// ═══════════════════════════════════════════════════════════════════════════════
const MOCK_CATEGORIES = [
  { id: 1, name: 'Coffee & Hot Drinks', color: '#a05c34' },
  { id: 2, name: 'Cold Beverages',      color: '#3b82f6' },
  { id: 3, name: 'Snacks & Starters',   color: '#f59e0b' },
  { id: 4, name: 'Main Course',         color: '#ef4444' },
  { id: 5, name: 'Desserts',            color: '#ec4899' },
  { id: 6, name: 'Breads & Bakery',     color: '#84cc16' },
];

const MOCK_PRODUCTS = [
  { id: 1, category_id: 1, name: 'Espresso',          price: 80,  tax_percent: 5, unit_of_measure: 'cup' },
  { id: 2, category_id: 1, name: 'Cappuccino',         price: 120, tax_percent: 5, unit_of_measure: 'cup' },
  { id: 3, category_id: 1, name: 'Latte',              price: 130, tax_percent: 5, unit_of_measure: 'cup' },
  { id: 4, category_id: 1, name: 'Masala Chai',        price: 60,  tax_percent: 5, unit_of_measure: 'cup' },
  { id: 5, category_id: 1, name: 'Hot Chocolate',      price: 110, tax_percent: 5, unit_of_measure: 'cup' },
  { id: 6, category_id: 2, name: 'Cold Coffee',        price: 140, tax_percent: 5, unit_of_measure: 'cup' },
  { id: 7, category_id: 2, name: 'Mango Smoothie',     price: 120, tax_percent: 5, unit_of_measure: 'cup' },
  { id: 8, category_id: 2, name: 'Fresh Lime Soda',    price: 80,  tax_percent: 5, unit_of_measure: 'cup' },
  { id: 9, category_id: 2, name: 'Iced Tea',           price: 90,  tax_percent: 5, unit_of_measure: 'cup' },
  { id: 10, category_id: 3, name: 'Veg Sandwich',      price: 100, tax_percent: 5, unit_of_measure: 'piece' },
  { id: 11, category_id: 3, name: 'Paneer Tikka',      price: 180, tax_percent: 5, unit_of_measure: 'plate' },
  { id: 12, category_id: 3, name: 'French Fries',      price: 90,  tax_percent: 5, unit_of_measure: 'plate' },
  { id: 13, category_id: 4, name: 'Dal Makhani',       price: 200, tax_percent: 5, unit_of_measure: 'plate' },
  { id: 14, category_id: 4, name: 'Paneer Butter Masala', price: 220, tax_percent: 5, unit_of_measure: 'plate' },
  { id: 15, category_id: 4, name: 'Veg Biryani',       price: 180, tax_percent: 5, unit_of_measure: 'plate' },
  { id: 16, category_id: 5, name: 'Chocolate Brownie', price: 110, tax_percent: 5, unit_of_measure: 'piece' },
  { id: 17, category_id: 5, name: 'Gulab Jamun',       price: 80,  tax_percent: 5, unit_of_measure: 'plate' },
  { id: 18, category_id: 5, name: 'Cheesecake',        price: 150, tax_percent: 5, unit_of_measure: 'piece' },
  { id: 19, category_id: 6, name: 'Butter Croissant',  price: 80,  tax_percent: 5, unit_of_measure: 'piece' },
  { id: 20, category_id: 6, name: 'Garlic Bread',      price: 90,  tax_percent: 5, unit_of_measure: 'plate' },
];

const MOCK_FLOORS = [
  {
    id: 1, name: 'Ground Floor',
    tables: [
      { id: 1, table_number: 'T1', seats: 2, has_order: false },
      { id: 2, table_number: 'T2', seats: 4, has_order: true  },
      { id: 3, table_number: 'T3', seats: 4, has_order: false },
      { id: 4, table_number: 'T4', seats: 6, has_order: true  },
      { id: 5, table_number: 'T5', seats: 2, has_order: false },
    ],
  },
  {
    id: 2, name: 'First Floor',
    tables: [
      { id: 6,  table_number: 'T6',  seats: 4, has_order: false },
      { id: 7,  table_number: 'T7',  seats: 4, has_order: false },
      { id: 8,  table_number: 'T8',  seats: 6, has_order: true  },
      { id: 9,  table_number: 'T9',  seats: 8, has_order: false },
      { id: 10, table_number: 'T10', seats: 2, has_order: false },
    ],
  },
  {
    id: 3, name: 'Terrace',
    tables: [
      { id: 11, table_number: 'T11', seats: 4, has_order: false },
      { id: 12, table_number: 'T12', seats: 4, has_order: false },
      { id: 13, table_number: 'T13', seats: 6, has_order: true  },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, categoryColor, onAdd, inCartQty }) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="group relative bg-gray-800/70 hover:bg-gray-700/80 border border-gray-700/60
                 hover:border-gray-500 rounded-2xl p-3.5 text-left transition-all duration-200
                 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus:outline-none
                 focus:ring-2 focus:ring-amber-500/50"
    >
      {/* Category color strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ backgroundColor: categoryColor }}
      />

      {/* Badge if in cart */}
      {inCartQty > 0 && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
                     text-[10px] font-bold text-white shadow-md"
          style={{ backgroundColor: categoryColor }}
        >
          {inCartQty}
        </div>
      )}

      <div className="mt-1">
        <p className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-amber-400 font-bold text-base">{fmt(product.price)}</span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md opacity-80 text-white"
            style={{ backgroundColor: `${categoryColor}55` }}
          >
            {product.unit_of_measure}
          </span>
        </div>
        {product.tax_percent > 0 && (
          <p className="text-gray-500 text-[10px] mt-1">+{product.tax_percent}% tax</p>
        )}
      </div>

      {/* Hover add icon */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
          <Icon.Plus />
        </div>
      </div>
    </button>
  );
}

// ── Cart Line Item ────────────────────────────────────────────────────────────
function CartItem({ item, onQtyChange, onRemove }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-700/50 group">
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
        style={{ backgroundColor: item.category_color || '#6366f1' }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{item.product_name}</p>
        <p className="text-gray-400 text-xs">{fmt(item.unit_price)} × {item.quantity}</p>
        {item.discount_amount > 0 && (
          <p className="text-emerald-400 text-xs">-{fmt(item.discount_amount)} promo</p>
        )}
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onQtyChange(item.product_id, item.quantity - 1)}
          className="w-6 h-6 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center
                     justify-center transition-colors"
        >
          <Icon.Minus />
        </button>
        <span className="text-white font-semibold text-sm w-5 text-center">{item.quantity}</span>
        <button
          onClick={() => onQtyChange(item.product_id, item.quantity + 1)}
          className="w-6 h-6 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center
                     justify-center transition-colors"
        >
          <Icon.Plus />
        </button>
      </div>

      {/* Line total */}
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        <span className="text-amber-400 font-bold text-sm">
          {fmt(item.unit_price * item.quantity)}
        </span>
        <button
          onClick={() => onRemove(item.product_id)}
          className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Icon.Trash />
        </button>
      </div>
    </div>
  );
}

// ── Floor Pop-up Modal ────────────────────────────────────────────────────────
function FloorModal({ floors, onSelect, onClose }) {
  const [activeFloor, setActiveFloor] = useState(floors[0]?.id);
  const floor = floors.find(f => f.id === activeFloor) || floors[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold text-lg">Select a Table</h2>
            <p className="text-gray-400 text-sm">Choose the table for this order</p>
          </div>
          <button onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors">
            <Icon.X />
          </button>
        </div>

        {/* Floor tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {floors.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFloor(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${activeFloor === f.id
                  ? 'bg-amber-500 text-gray-900 shadow'
                  : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Tables grid */}
        <div className="p-6 grid grid-cols-4 gap-3">
          {(floor?.tables || []).map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t, floor)}
              className={`relative p-4 rounded-2xl border-2 transition-all duration-150 text-center
                hover:scale-105 active:scale-100
                ${t.has_order
                  ? 'border-amber-500 bg-amber-500/10 hover:border-amber-400'
                  : 'border-gray-700 bg-gray-800/60 hover:border-gray-500'}`}
            >
              {t.has_order && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              )}
              <div className="text-white font-bold text-base">{t.table_number}</div>
              <div className="text-gray-400 text-xs mt-0.5">{t.seats} seats</div>
              <div className={`text-xs font-medium mt-1.5 ${t.has_order ? 'text-amber-400' : 'text-gray-500'}`}>
                {t.has_order ? 'Active' : 'Free'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Discount / Coupon Modal ───────────────────────────────────────────────────
function DiscountModal({ onApply, onClose }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  const handleValidate = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      // Try real API, fall back to mock
      const data = await couponsAPI.validate(code.trim()).catch(() => {
        // Mock coupon validation
        const mocks = {
          'WELCOME10': { discount_type: 'percent', discount_value: 10, code: 'WELCOME10' },
          'FLAT50':    { discount_type: 'fixed',   discount_value: 50, code: 'FLAT50' },
        };
        const m = mocks[code.toUpperCase()];
        if (!m) throw new Error('Invalid coupon code');
        return m;
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Invalid coupon code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Icon.Tag /> Apply Coupon
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><Icon.X /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleValidate()}
            placeholder="Enter coupon code…"
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3
                       focus:outline-none focus:border-amber-500 text-sm font-mono tracking-widest"
          />
          <button
            onClick={handleValidate}
            disabled={loading}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl
                       transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? '…' : 'Apply'}
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Icon.Check />
              <span className="font-semibold">
                {result.discount_type === 'percent'
                  ? `${result.discount_value}% off applied!`
                  : `₹${result.discount_value} flat off applied!`}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">Code: {result.code}</p>
          </div>
        )}

        {result && (
          <button
            onClick={() => onApply(result)}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500
                       hover:to-emerald-400 text-white font-bold rounded-xl transition-all shadow-md"
          >
            Confirm & Apply Discount
          </button>
        )}

        <p className="text-gray-500 text-xs text-center mt-4">
          Try: WELCOME10 (10% off) · FLAT50 (₹50 off)
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PosTerminal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cart, addProduct, removeItem, updateQty, applyDiscount, setTable, clearCart } = useCart();

  // ── Data state ────────────────────────────────────────────────────────────
  const [categories,    setCategories]    = useState(MOCK_CATEGORIES);
  const [products,      setProducts]      = useState(MOCK_PRODUCTS);
  const [floors,        setFloors]        = useState(MOCK_FLOORS);
  const [activeCategory, setActiveCategory] = useState(null); // null = all
  const [searchQuery,   setSearchQuery]   = useState('');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showFloor,    setShowFloor]    = useState(true);  // open on first load
  const [showDiscount, setShowDiscount] = useState(false);
  const [sending,      setSending]      = useState(false);
  const [sentSuccess,  setSentSuccess]  = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const menuRef = useRef(null);

  // ── Load data from API (falls back to mock) ───────────────────────────────
  useEffect(() => {
    Promise.all([
      categoriesAPI.list().catch(() => MOCK_CATEGORIES),
      productsAPI.list().catch(() => MOCK_PRODUCTS),
      tablesAPI.floors().catch(() => MOCK_FLOORS),
    ]).then(([cats, prods, flrs]) => {
      if (Array.isArray(cats) && cats.length) setCategories(cats);
      if (Array.isArray(prods) && prods.length) setProducts(prods);
      if (Array.isArray(flrs) && flrs.length)   setFloors(flrs);
    });
  }, []);

  // close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  const visibleProducts = products.filter(p => {
    const matchesCat = activeCategory === null || p.category_id === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const cartQtyMap = Object.fromEntries(cart.items.map(i => [i.product_id, i.quantity]));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddProduct = useCallback((product) => {
    const cat = categoryMap[product.category_id];
    addProduct({ ...product, category_color: cat?.color });
  }, [addProduct, categoryMap]);

  const handleTableSelect = (table, floor) => {
    setTable(table.id, `${floor.name} · ${table.table_number}`);
    setShowFloor(false);
  };

  const handleApplyCoupon = (coupon) => {
    const subtotalForCalc = cart.subtotal + cart.tax;
    const discountAmt = coupon.discount_type === 'percent'
      ? (subtotalForCalc * coupon.discount_value) / 100
      : coupon.discount_value;
    applyDiscount(Math.min(discountAmt, subtotalForCalc), coupon);
    setShowDiscount(false);
  };

  const handleSendToKitchen = async () => {
    if (cart.items.length === 0) return;
    setSending(true);
    try {
      await ordersAPI.create({
        table_id: cart.tableId,
        customer_id: cart.customer?.id,
        items: cart.items.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          tax_percent: i.tax_percent,
        })),
        coupon_id: cart.coupon?.id,
        subtotal: cart.subtotal,
        tax_amount: cart.tax,
        discount_amount: cart.discount,
        total_amount: cart.total,
      }).catch(() => ({ id: Date.now() })); // mock fallback

      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    } catch (err) {
      console.error('Send to kitchen failed:', err);
    } finally {
      setSending(false);
    }
  };

  const navLinks = [
    { label: 'Products',          path: '/admin/products' },
    { label: 'Categories',        path: '/admin/categories' },
    { label: 'Payment Methods',   path: '/admin/payments' },
    { label: 'Coupon & Promotion',path: '/admin/coupons' },
    { label: 'Bookings',          path: '/admin/bookings' },
    { label: 'Users / Employees', path: '/admin/users' },
    { label: 'Kitchen Display',   path: '/kds' },
    { label: 'Reports',           path: '/admin/reports' },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">

      {/* ── Top Nav Bar ─────────────────────────────────────────────────── */}
      <header className="bg-gray-900/95 border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 z-30 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
            <Icon.Coffee />
          </div>
          <span className="text-white font-bold text-sm hidden md:block">Odoo Cafe</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
            POS Order
          </button>
          <button
            onClick={() => navigate('/admin/orders')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Orders
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            Customer
          </button>
          <button
            onClick={() => setShowFloor(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800
                       transition-colors flex items-center gap-1.5"
          >
            <Icon.Table /> Table View
          </button>
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-sm ml-auto relative">
          <Icon.Search />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-gray-800/80 border border-gray-700 text-white text-sm rounded-xl
                       pl-9 pr-4 py-2 focus:outline-none focus:border-amber-500 transition-colors"
            style={{ paddingLeft: '2.25rem' }}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <Icon.Search />
          </div>
        </div>

        {/* Table indicator */}
        {cart.tableLabel && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <Icon.Table />
            <span className="text-amber-400 text-xs font-semibold">{cart.tableLabel}</span>
          </div>
        )}

        {/* User + hamburger */}
        <div className="flex items-center gap-2 ml-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center
                         text-gray-400 hover:text-white transition-colors"
            >
              <Icon.Menu />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-gray-900 border border-gray-700
                              rounded-2xl shadow-xl z-50 py-1 overflow-hidden">
                {navLinks.map(l => (
                  <button
                    key={l.path}
                    onClick={() => { navigate(l.path); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800
                               hover:text-white transition-colors"
                  >
                    {l.label}
                  </button>
                ))}
                <div className="border-t border-gray-700 mt-1 pt-1">
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10
                               hover:text-red-300 transition-colors"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main split layout ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══ LEFT — Products Panel ═══════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Category filter tabs */}
          <div className="bg-gray-900/60 border-b border-gray-800 px-4 py-2.5 flex items-center gap-2 overflow-x-auto flex-shrink-0">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all
                ${activeCategory === null
                  ? 'bg-gray-100 text-gray-900 shadow-md'
                  : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                style={activeCategory === cat.id
                  ? { backgroundColor: cat.color, color: '#fff', boxShadow: `0 0 14px ${cat.color}55` }
                  : { borderColor: `${cat.color}44` }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0
                             transition-all border
                  ${activeCategory === cat.id ? '' : 'bg-gray-800/60 text-gray-400 hover:text-white'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {visibleProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                <Icon.Search />
                <p className="mt-3 text-sm">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {visibleProducts.map(product => {
                  const cat = categoryMap[product.category_id];
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      categoryColor={cat?.color || '#6366f1'}
                      onAdd={handleAddProduct}
                      inCartQty={cartQtyMap[product.id] || 0}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT — Cart Panel ═══════════════════════════════════════════════ */}
        <div className="w-80 xl:w-96 bg-gray-900/95 border-l border-gray-800 flex flex-col flex-shrink-0">

          {/* Cart header */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-white font-bold">Current Order</h2>
              {cart.tableLabel && (
                <p className="text-amber-400 text-xs mt-0.5">{cart.tableLabel}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {cart.items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="px-2.5 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10
                             border border-red-500/20 transition-colors"
                >
                  Clear
                </button>
              )}
              <span className="text-gray-500 text-xs">{cart.items.length} items</span>
            </div>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-3">
                  <Icon.Coffee />
                </div>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs mt-1 text-gray-700">Tap a product to add it</p>
              </div>
            ) : (
              cart.items.map(item => (
                <CartItem
                  key={item.product_id}
                  item={item}
                  onQtyChange={updateQty}
                  onRemove={removeItem}
                />
              ))
            )}
          </div>

          {/* Action buttons row */}
          <div className="px-5 py-3 border-t border-gray-800 flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFloor(true)}
              title="Table View"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                         bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs
                         font-medium border border-gray-700 transition-all"
            >
              <Icon.Table /> Table
            </button>
            <button
              onClick={() => setShowDiscount(true)}
              title="Apply Discount"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                         bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs
                         font-medium border border-gray-700 transition-all"
            >
              <Icon.Tag /> Discount
            </button>
            <button
              title="Customer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                         bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs
                         font-medium border border-gray-700 transition-all"
            >
              <Icon.User /> Customer
            </button>
          </div>

          {/* Order summary */}
          <div className="px-5 pb-3 flex-shrink-0 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span>
              <span className="text-white">{fmt(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Tax</span>
              <span className="text-white">{fmt(cart.tax)}</span>
            </div>
            {cart.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-400">
                <span>Discount {cart.coupon ? `(${cart.coupon.code})` : '(promo)'}</span>
                <span>-{fmt(cart.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-700 pt-2 flex justify-between font-bold text-base">
              <span className="text-white">Total</span>
              <span className="text-amber-400 text-lg">{fmt(cart.total)}</span>
            </div>
          </div>

          {/* Send to Kitchen CTA */}
          <div className="px-5 pb-5 flex-shrink-0">
            <button
              id="send-to-kitchen-btn"
              onClick={handleSendToKitchen}
              disabled={cart.items.length === 0 || sending}
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide flex items-center
                          justify-center gap-2.5 transition-all duration-200 shadow-lg
                ${sentSuccess
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                  : cart.items.length > 0
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 shadow-amber-500/30 hover:shadow-amber-500/40 hover:scale-[1.02]'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'}`}
            >
              {sentSuccess ? (
                <><Icon.Check /> Sent to Kitchen!</>
              ) : sending ? (
                <><span className="w-4 h-4 border-2 border-gray-900/40 border-t-gray-900 rounded-full animate-spin" /> Sending…</>
              ) : (
                <><Icon.Send /> Send to Kitchen</>
              )}
            </button>

            {/* Pay button */}
            {cart.items.length > 0 && (
              <button
                onClick={() => navigate('/pos/payment')}
                className="w-full mt-2 py-3 rounded-2xl font-semibold text-sm border border-gray-700
                           bg-gray-800/60 hover:bg-gray-700 text-white transition-all duration-200
                           flex items-center justify-center gap-2"
              >
                Proceed to Payment →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showFloor   && <FloorModal    floors={floors}  onSelect={handleTableSelect} onClose={() => setShowFloor(false)} />}
      {showDiscount && <DiscountModal onApply={handleApplyCoupon}  onClose={() => setShowDiscount(false)} />}
    </div>
  );
}
