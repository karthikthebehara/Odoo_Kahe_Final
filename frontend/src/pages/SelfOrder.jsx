/**
 * frontend/src/pages/SelfOrder.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Customer Self-Ordering Page — accessible at /s/:token
 *
 * Implements a premium step-by-step mobile customer wizard:
 *   Step 1: Welcome/Splash page (View Menu vs Order Online options)
 *   Step 2: Interactive Menu Selection Screen (browse, search, categories, cart summary footer)
 *   Step 3: Preference Customization modal overlay
 *   Step 4: Payment / Checkout Screen (detailed cart, quick select 10% / ₹50 coupons, billing)
 *   Step 5: Order Confirmation screen (green checkmark, order number, total)
 *   Step 6: Order Status tracker screen (live KDS stages)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const publicApi = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } });

// KDS configuration mapping
// eslint-disable-next-line no-unused-vars
const KDS_STAGES = ['To Cook', 'Preparing', 'Completed'];
const KDS_LABELS = { 'To Cook': 'Order Received', 'Preparing': 'Preparing in Kitchen', 'Completed': 'Ready for Pickup!' };
const KDS_ICONS  = { 'To Cook': '📋', 'Preparing': '🍳', 'Completed': '✅' };

// SVG icons
const SearchIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx={11} cy={11} r={8} /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
  </svg>
);
const CartIcon = () => (
  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" /><path strokeLinecap="round" d="M16 10a4 4 0 01-8 0" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
  </svg>
);
const MinusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" d="M5 12h14" />
  </svg>
);
const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

// Static background image slider
function BgSlider({ images }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images.length]);
  if (!images || images.length === 0) return null;
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {images.map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${img.dataUrl || img})`,
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-slate-950/80" />
    </div>
  );
}

// Preference/Customization Options Builder
const getCustomizationOptions = (product) => {
  const name = product.name.toLowerCase();
  if (name.includes('burger') || name.includes('sandwich')) {
    return {
      options: ['Veg Option', 'Chicken Option'],
      addons: ['Extra Cheese slice', 'Special Spicy Sauce', 'Wheat bun selection']
    };
  } else if (name.includes('coffee') || name.includes('latte') || name.includes('tea') || name.includes('beverage')) {
    return {
      options: ['Regular Hot', 'Iced Version'],
      addons: ['Extra Espresso Shot', 'Whipped Cream topping', 'Sugar-free syrup']
    };
  } else if (name.includes('cake') || name.includes('muffin') || name.includes('dessert')) {
    return {
      options: ['Single Serving', 'Double Portion size'],
      addons: ['Add Vanilla Scoop', 'Chocolate Drizzle', 'Extra nuts']
    };
  }
  return {
    options: ['Standard Size', 'Large Portion size'],
    addons: ['Add Premium Garnish', 'Extra sauce dressing']
  };
};

export default function SelfOrder() {
  const { token } = useParams();

  // Navigation phase: loading | error | landing | menu | checkout | confirmed | tracker
  const [phase, setPhase] = useState('loading');
  const [isMenuOnly, setIsMenuOnly] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tableInfo, setTableInfo] = useState(null);
  const [config, setConfig] = useState({ enabled: false, mode: 'online', bgColor: '#0f172a', bgImages: [] });

  // Catalog
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Cart & Preferences
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customOption, setCustomOption] = useState('');
  const [customAddons, setCustomAddons] = useState([]);
  const [customQty, setCustomQty] = useState(1);

  // Coupon / Discounts
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Payment Method
  const [selectedPayment, setSelectedPayment] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  // Guest contact details for billing
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Submission / Polling
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [trackedOrderId, setTrackedOrderId] = useState(null);
  const [trackedOrderData, setTrackedOrderData] = useState(null);
  const pollIntervalRef = useRef(null);
  // Server-side preview and final receipt
  const [orderPreview, setOrderPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // BOOT: verify token and load initial master data
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      setPhase('loading');
      try {
        const [tableRes, cfgRes, catRes, prodRes] = await Promise.all([
          publicApi.get(`/api/self-order/verify/${token}`),
          publicApi.get('/api/self-order/config'),
          publicApi.get('/api/categories'),
          publicApi.get('/api/products'),
        ]);

        const tableData = tableRes.data?.data || tableRes.data;
        const cfgData   = cfgRes.data?.data   || cfgRes.data;
        const catData   = catRes.data?.data    || catRes.data   || [];
        const prodData  = prodRes.data?.data   || prodRes.data  || [];

        if (!tableData?.table_id) {
          setErrorMsg('Invalid table link. Please scan the official QR code at your table.');
          setPhase('error');
          return;
        }

        // If self ordering is globally disabled, block access
        if (!cfgData?.enabled) {
          setErrorMsg('Online self-ordering is currently disabled at this location. Please order directly with our wait staff.');
          setPhase('error');
          return;
        }

        setTableInfo(tableData);
        setConfig(cfgData);
        setCategories(Array.isArray(catData) ? catData : []);
        setProducts(Array.isArray(prodData) ? prodData : []);
        setPhase('landing');
      } catch (err) {
        console.error('[SelfOrder] Boot failure:', err);
        setErrorMsg(err.response?.data?.error || err.message || 'Unable to connect to the restaurant servers.');
        setPhase('error');
      }
    };
    if (token) boot();
  }, [token]);

  // ─────────────────────────────────────────────────────────────────────────
  // CATALOG FILTER LOGIC
  // ─────────────────────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'all' || String(p.category_id) === String(activeCategory);
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOMIZATION & CART ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const openCustomization = (product) => {
    const opts = getCustomizationOptions(product);
    setSelectedProduct(product);
    setCustomOption(opts.options[0] || '');
    setCustomAddons([]);
    setCustomQty(1);
  };

  const handleToggleAddon = (addon) => {
    setCustomAddons(prev =>
      prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]
    );
  };

  const handleAddCustomizedToCart = () => {
    if (!selectedProduct) return;

    const customizationDetails = [];
    if (customOption) customizationDetails.push(customOption);
    if (customAddons.length > 0) customizationDetails.push(...customAddons);

    const customizationsText = customizationDetails.length > 0
      ? `(${customizationDetails.join(', ')})`
      : '';

    const cartKey = `${selectedProduct.id}_${customOption}_${customAddons.sort().join('_')}`;

    setCart(prev => {
      const existing = prev.find(i => i.id === cartKey);
      if (existing) {
        return prev.map(i => i.id === cartKey ? { ...i, qty: i.qty + customQty } : i);
      }
      return [
        ...prev,
        {
          id: cartKey,
          productId: selectedProduct.id,
          name: `${selectedProduct.name} ${customizationsText}`,
          baseName: selectedProduct.name,
          price: Number(selectedProduct.price),
          qty: customQty,
          customizationsText
        }
      ];
    });

    setSelectedProduct(null);
  };

  const updateCartQty = (id, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
    } else {
      setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i));
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // MATH TOTALS
  // ─────────────────────────────────────────────────────────────────────────
  // Prefer server preview totals when available to match backend promo engine
  const totals = (() => {
    if (orderPreview && orderPreview.data) {
      const p = orderPreview.data;
      return { subtotal: p.subtotal, tax: p.tax, discount: p.total_discount, total: p.total };
    }
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxRate = 0.05;
    const tax = subtotal * taxRate;
    const discount = couponInfo ? (() => {
      if (couponInfo.discount_type === 'percentage') {
        let d = (subtotal * couponInfo.value) / 100;
        if (couponInfo.max_discount_amount) d = Math.min(d, couponInfo.max_discount_amount);
        return d;
      }
      return Math.min(couponInfo.value, subtotal);
    })() : 0;
    const total = Math.max(subtotal + tax - discount, 0);
    return { subtotal, tax, discount, total };
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // COUPON VALIDATION & APPLICATION
  // ─────────────────────────────────────────────────────────────────────────
  const handleApplyCoupon = async (codeToApply = couponInput) => {
    const formattedCode = codeToApply.trim().toUpperCase();
    if (!formattedCode) return;

    setApplyingCoupon(true);
    setCouponError('');
    setCouponInfo(null);

    try {
      const res = await publicApi.post('/api/coupons/validate', { code: formattedCode });
      const data = res.data?.data || res.data;
      setCouponInfo(data);
      setCouponInput(formattedCode);
      setShowCouponDialog(false);
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Invalid or expired coupon code.');
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Fetch server preview when cart or coupon changes (debounced)
  useEffect(() => {
    let mounted = true;
    let timer = null;
    const fetchPreview = async () => {
      if (cart.length === 0) {
        setOrderPreview(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const payload = {
          items: cart.map(i => ({ product_id: i.productId, quantity: i.qty })),
          coupon_code: couponInput || null
        };
        const res = await publicApi.post('/api/orders/preview', payload);
        if (!mounted) return;
        setOrderPreview(res.data || res.data?.data || null);
      } catch (err) {
        // ignore preview errors for now
        setOrderPreview(null);
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    };
    timer = setTimeout(fetchPreview, 450);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [cart, couponInput]);

  // ─────────────────────────────────────────────────────────────────────────
  // CHECKOUT ORDER SUBMIT
  // ─────────────────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    // Require contact details for billing
    if (!customerName.trim()) {
      setSubmitError('Please enter your name for the bill.');
      return;
    }
    if (!customerPhone.trim()) {
      setSubmitError('Please enter your contact phone number.');
      return;
    }
    if (!transactionRef.trim()) {
      setSubmitError('Please enter the UPI Transaction Reference Number (UTR) to confirm your payment.');
      return;
    }
    if (transactionRef.trim().length < 6) {
      setSubmitError('Please enter a valid Transaction Reference / UTR number.');
      return;
    }

    setSubmitting(true);
    setIsVerifyingPayment(true);
    setSubmitError('');

    // Simulate premium verification with bank
    setTimeout(async () => {
      try {
        const payload = {
          token,
          items: cart.map(i => ({ product_id: i.productId, quantity: i.qty })),
          coupon_code: couponInfo ? couponInput : null,
          payment_method: 'UPI',
          payment_ref: transactionRef,
          status: 'paid',
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || null,
          customer_phone: customerPhone.trim() || null,
        };

        const res = await publicApi.post('/api/self-order/order', payload);
        const data = res.data?.data || res.data;
        const orderId = data?.orderId || data?.id;

        if (!orderId) throw new Error('No order identifier returned by server.');

        setTrackedOrderId(orderId);
        // store server-side order payload for receipt printing/view
        setOrderReceipt(data);
        setPhase('confirmed');
      } catch (err) {
        setSubmitError(err.response?.data?.error || err.message || 'Payment failed. Please verify items and try again.');
        setIsVerifyingPayment(false);
      } finally {
        setSubmitting(false);
      }
    }, 1800);
  };

  const handlePrintReceipt = () => {
    if (!orderReceipt) return;
    try {
      const w = window.open('', '_blank');
      const o = orderReceipt;
      const itemsHtml = (o.items || []).map(it => `
        <tr>
          <td>${it.quantity}× ${it.product_name}</td>
          <td style="text-align:right">₹${Number(it.subtotal).toFixed(2)}</td>
        </tr>
      `).join('');
      const promoHtml = o.promotions_applied && o.promotions_applied.coupon ?
        `<tr><td>Coupon (${o.promotions_applied.coupon.coupon_code})</td><td style="text-align:right">-₹${Number(o.promotions_applied.coupon.discount_applied).toFixed(2)}</td></tr>` : '';

      const html = `
        <html><head><title>Receipt ${o.order.order_number}</title>
        <style>body{font-family:Arial,sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse}td{padding:6px 0}</style>
        </head><body>
        <h2>Odoo Café</h2>
        <p>Order: ${o.order.order_number}<br/>Amount: ₹${Number(o.order.total_amount).toFixed(2)}</p>
        <table>${itemsHtml}${promoHtml}</table>
        <hr/>
        <p>Total: <strong>₹${Number(o.order.total_amount).toFixed(2)}</strong></p>
        </body></html>
      `;
      w.document.write(html);
      w.document.close();
      w.print();
    } catch (e) {
      console.warn('Print failed', e);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LIVE KDS TRACKING POLL
  // ─────────────────────────────────────────────────────────────────────────
  const fetchTrackingStatus = useCallback(async () => {
    if (!trackedOrderId) return;
    try {
      const res = await publicApi.get(`/api/self-order/order/${trackedOrderId}`);
      const data = res.data?.data || res.data;
      setTrackedOrderData(data);
      if (data?.kds_status === 'Completed') {
        clearInterval(pollIntervalRef.current);
      }
    } catch (err) {
      console.warn('[SelfOrder] Status tracking poll failed:', err);
    }
  }, [trackedOrderId]);

  useEffect(() => {
    if (phase === 'tracker' && trackedOrderId) {
      fetchTrackingStatus();
      pollIntervalRef.current = setInterval(fetchTrackingStatus, 5000);
    }
    return () => clearInterval(pollIntervalRef.current);
  }, [phase, trackedOrderId, fetchTrackingStatus]);

  // Restart flow
  const handleResetFlow = () => {
    setCart([]);
    setCouponInput('');
    setCouponInfo(null);
    setCouponError('');
    setTrackedOrderId(null);
    setTrackedOrderData(null);
    setTransactionRef('');
    setIsVerifyingPayment(false);
    setPhase('landing');
  };

  // RENDER INTERFACES BY PHASE
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 sm:p-4 text-white font-sans antialiased selection:bg-amber-500 selection:text-gray-900">
      
      {/* Centered Premium Mobile Frame wrapper */}
      <div className="w-full max-w-md h-screen sm:h-[88vh] sm:max-h-[850px] bg-slate-900 border border-slate-800 rounded-none sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col relative sm:ring-8 sm:ring-slate-950/60 transition-all duration-300">
        
        {/* Background slide/overlay */}
        <BgSlider images={config.bgImages} />

        {/* ── LOADING VIEW ── */}
        {phase === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 mb-2 animate-bounce">
              ☕
            </div>
            <div className="w-8 h-8 border-3 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-semibold tracking-wider">Validating Table QR Token...</p>
          </div>
        )}

        {/* ── ERROR VIEW ── */}
        {phase === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-5 relative z-10 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center justify-center text-3xl text-red-400">
              ⚠️
            </div>
            <h1 className="text-white font-black text-xl tracking-tight">Service Unavailable</h1>
            <p className="text-slate-400 text-sm leading-relaxed">{errorMsg}</p>
            <div className="w-12 h-0.5 bg-slate-800" />
            <p className="text-slate-500 text-xs font-medium">Please flag a cashier or waiter to take your table order.</p>
          </div>
        )}

        {/* ── STEP 1: SPLASH / WELCOME SCREEN ── */}
        {phase === 'landing' && (
          <div className="flex-1 flex flex-col justify-between p-6 pb-12 relative z-10 animate-in fade-in duration-300">
            
            {/* Top Branding Section */}
            <div className="text-center pt-10">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-amber-500/25 mb-5 border border-white/10">
                ☕
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Odoo Café</h1>
              <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mt-1">Self ordering terminal</p>
              
              {/* Dining Table Tag */}
              <div className="mt-6 inline-block bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 px-5 py-2.5 rounded-full shadow-md">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Location</p>
                <p className="text-sm font-black text-white mt-0.5">{tableInfo?.floor_name} • Table {tableInfo?.table_number}</p>
              </div>
            </div>

            {/* Bottom Actions section */}
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl text-center backdrop-blur-sm">
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Welcome to our café! Scan, pick items and checkout directly on your screen.
                </p>
              </div>

              {/* Two Option Buttons */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    setIsMenuOnly(false);
                    setPhase('menu');
                  }}
                  className="w-full py-4.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <span>🛒</span> Order Online (Self-Order)
                </button>

                <button
                  onClick={() => {
                    setIsMenuOnly(true);
                    setPhase('menu');
                  }}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm rounded-2xl border border-slate-700/60 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <span>📖</span> Only View Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: INTERACTIVE MENU SELECTION SCREEN ── */}
        {phase === 'menu' && (
          <div className="flex-1 flex flex-col min-h-0 relative z-10 animate-in slide-in-from-right-4 duration-300">
            
            {/* Sticky Header with Search */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setPhase('landing')}
                  className="w-9 h-9 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-center text-white"
                  aria-label="Back to splash"
                >
                  <ChevronLeftIcon />
                </button>

                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Search menu products..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-amber-500/50 text-white placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none transition-colors"
                  />
                </div>

                {/* Cart Action button */}
                {!isMenuOnly && (
                  <button
                    onClick={() => cartCount > 0 && setPhase('checkout')}
                    className="relative w-9 h-9 bg-slate-850/80 border border-slate-750 rounded-xl flex items-center justify-center"
                    aria-label="View Cart Checkout"
                  >
                    <CartIcon />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                        {cartCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Mode Badges */}
              <div className="mt-3 flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold">
                  {tableInfo?.floor_name} • Table {tableInfo?.table_number}
                </span>

                {isMenuOnly ? (
                  <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    📖 Digital Menu (View)
                  </span>
                ) : (
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Ordering Open
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable Category Tabs */}
            <div className="px-4 py-3 bg-slate-900/30 overflow-x-auto scrollbar-none flex-shrink-0 flex gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                  activeCategory === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-850/80 text-slate-400 border-slate-800'
                }`}
              >
                All items
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                    String(activeCategory) === String(cat.id)
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-850/80 text-slate-400 border-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Scrollable Products List */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2">
              {filteredProducts.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <span className="text-3xl block mb-2">🍽️</span>
                  No products match your criteria.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map(p => {
                    const matchedQty = cart
                      .filter(i => i.productId === p.id)
                      .reduce((sum, item) => sum + item.qty, 0);

                    return (
                      <div
                        key={p.id}
                        onClick={() => openCustomization(p)}
                        className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-2.5 flex flex-col justify-between hover:border-amber-500/40 cursor-pointer active:scale-98 transition-all group relative overflow-hidden"
                      >
                        <div className="aspect-square bg-slate-950/60 rounded-xl flex items-center justify-center text-3xl mb-2 relative overflow-hidden">
                          <span>{p.category_id === 1 ? '☕' : p.category_id === 2 ? '🥐' : '🍰'}</span>
                          
                          {/* Cart Quantity indicator badge */}
                          {matchedQty > 0 && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                              {matchedQty}
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                            {p.name}
                          </h4>
                          {p.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {p.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-1.5 border-t border-slate-850">
                          <span className="text-amber-400 font-extrabold text-xs">{fmt(p.price)}</span>
                          {!isMenuOnly && (
                            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center hover:bg-amber-400 active:scale-90 shadow-md transition-all">
                              +
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Cart Summary block (Order Flow only) */}
            {!isMenuOnly && cartCount > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 to-transparent backdrop-blur-[2px]">
                <button
                  onClick={() => setPhase('checkout')}
                  className="w-full py-4 px-5 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 font-black text-sm rounded-2xl shadow-xl flex items-center justify-between hover:from-amber-400 hover:to-orange-400 active:scale-98 transition-all"
                >
                  <span className="bg-gray-900/10 px-2.5 py-1 rounded-lg text-xs font-black">
                    {cartCount} QTY
                  </span>
                  <span>Next: Check Order</span>
                  <span>Total: {fmt(totals.total)}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: PREFERENCE CUSTOMIZATION OVERLAY (Modal) ── */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs relative-mobile-modal" style={{ position: 'absolute' }}>
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
              
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-slate-800 rounded-full" />
              </div>

              {/* Customization header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-850">
                <h3 className="text-white font-extrabold text-base">Customize Preferences</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <XIcon />
                </button>
              </div>

              {/* Customization content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-slate-950 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
                    <span>{selectedProduct.category_id === 1 ? '☕' : selectedProduct.category_id === 2 ? '🥐' : '🍰'}</span>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-base leading-snug">{selectedProduct.name}</h4>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{selectedProduct.description || 'Made fresh to order.'}</p>
                    <p className="text-amber-400 font-extrabold text-sm mt-1">{fmt(selectedProduct.price)}</p>
                  </div>
                </div>

                {/* Preference selections */}
                {(() => {
                  const opts = getCustomizationOptions(selectedProduct);
                  return (
                    <div className="space-y-4 pt-2">
                      
                      {/* Radio Selection Option */}
                      {opts.options.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Select Style</label>
                          <div className="grid grid-cols-2 gap-2">
                            {opts.options.map(opt => (
                              <button
                                key={opt}
                                onClick={() => setCustomOption(opt)}
                                className={`px-4 py-3 rounded-xl border text-xs font-extrabold text-center transition-all ${
                                  customOption === opt
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md'
                                    : 'bg-slate-950/40 border-slate-850 text-slate-400'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Checkbox Add-ons Option */}
                      {opts.addons.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Add-ons (Free Preferences)</label>
                          <div className="space-y-2">
                            {opts.addons.map(addon => {
                              const isChecked = customAddons.includes(addon);
                              return (
                                <button
                                  key={addon}
                                  onClick={() => handleToggleAddon(addon)}
                                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold transition-all text-left ${
                                    isChecked
                                      ? 'bg-slate-850 border-amber-500/50 text-white'
                                      : 'bg-slate-950/20 border-slate-850 text-slate-400'
                                  }`}
                                >
                                  <span>{addon}</span>
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center border font-black text-[10px] ${
                                    isChecked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700 text-transparent'
                                  }`}>
                                    ✓
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Quantity Adjustment Selector */}
                {!isMenuOnly && (
                  <div className="space-y-2 pt-2">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Quantity</label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-850 px-4 py-2.5 rounded-xl w-32 justify-between">
                        <button
                          onClick={() => setCustomQty(q => Math.max(1, q - 1))}
                          className="text-slate-400 hover:text-white font-bold"
                          type="button"
                        >
                          -
                        </button>
                        <span className="text-white font-extrabold text-sm">{customQty}</span>
                        <button
                          onClick={() => setCustomQty(q => q + 1)}
                          className="text-slate-400 hover:text-white font-bold"
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        Total for this item: {fmt(selectedProduct.price * customQty)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customization footer */}
              <div className="p-5 border-t border-slate-850 bg-slate-900 flex gap-3">
                {isMenuOnly ? (
                  <button
                    disabled={true}
                    className="flex-1 py-4 bg-slate-800 text-slate-500 font-black text-sm rounded-2xl cursor-not-allowed border border-slate-800"
                  >
                    Digital Menu View Only
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="px-6 py-4 bg-slate-850 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl border border-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCustomizedToCart}
                      className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all"
                    >
                      Confirm Preference
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PAYMENT / CHECKOUT SCREEN ── */}
        {phase === 'checkout' && (
          <div className="flex-1 flex flex-col min-h-0 relative z-10 animate-in slide-in-from-right-4 duration-300">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPhase('menu')}
                  className="w-9 h-9 bg-slate-850/80 border border-slate-750 rounded-xl flex items-center justify-center text-white"
                  aria-label="Back to menu"
                >
                  <ChevronLeftIcon />
                </button>
                <h3 className="text-white font-black text-base">Payment & Review</h3>
              </div>
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-black">
                Checkout
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              
              {/* Location Tag */}
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Table Location</span>
                <span className="text-white font-extrabold">{tableInfo?.floor_name} - Table {tableInfo?.table_number}</span>
              </div>

              {/* Order items detail summary checklist */}
              <div className="space-y-2">
                <label className="text-slate-400 text-[10px] font-black uppercase tracking-wider ml-1">Ordered Items</label>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">Your cart is empty. Return to the menu to add products.</div>
                ) : (
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.id} className="bg-slate-900/50 border border-slate-850 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-extrabold text-xs truncate leading-snug">{item.baseName}</p>
                          {item.customizationsText && (
                            <p className="text-[10px] text-amber-500/80 font-bold mt-0.5">{item.customizationsText}</p>
                          )}
                          <p className="text-slate-500 text-[10px] font-semibold mt-1">{fmt(item.price)} each</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Decrement */}
                          <button
                            onClick={() => updateCartQty(item.id, item.qty - 1)}
                            className="w-7 h-7 bg-slate-850 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <MinusIcon />
                          </button>
                          
                          <span className="text-white font-extrabold text-xs w-5 text-center">{item.qty}</span>
                          
                          {/* Increment */}
                          <button
                            onClick={() => updateCartQty(item.id, item.qty + 1)}
                            className="w-7 h-7 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-bold"
                          >
                            <PlusIcon />
                          </button>

                          <span className="text-white font-black text-xs w-16 text-right ml-1">
                            {fmt(item.price * item.qty)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount / Coupon Button Section */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-3">
                <button
                  onClick={() => {
                    setCouponError('');
                    setShowCouponDialog(true);
                  }}
                  className="w-full py-3 bg-slate-850 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-all"
                >
                  🎟️ Discount (Have a coupon code?)
                </button>

                {couponInfo && (
                  <div className="flex justify-between items-center text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl font-bold">
                    <span>Applied: {couponInput} ({couponInfo.name})</span>
                    <button
                      onClick={() => setCouponInfo(null)}
                      className="text-emerald-400 hover:text-red-400 font-extrabold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Guest contact details for bill */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-3">
                <label className="text-slate-400 text-[10px] font-black uppercase tracking-wider block ml-1">Your Details (for bill)</label>
                <div className="grid grid-cols-1 gap-2">
                  <label htmlFor="customer-name" className="sr-only">Full name</label>
                  <input
                    id="customer-name"
                    name="customer_name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-700 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none transition-colors"
                  />
                  <label htmlFor="customer-email" className="sr-only">Email</label>
                  <input
                    id="customer-email"
                    name="customer_email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-700 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none transition-colors"
                  />
                  <label htmlFor="customer-phone" className="sr-only">Phone number</label>
                  <input
                    id="customer-phone"
                    name="customer_phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9+\- ]/g, ''))}
                    placeholder="Phone number"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-700 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Billing Details breakdown */}
              <div className="bg-slate-900/80 border border-slate-850 rounded-3xl p-5 space-y-3.5">
                <h4 className="text-white font-black text-xs uppercase tracking-wider">Bill Summary</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400 font-semibold">
                    <span>Subtotal</span>
                    <span className="text-white">{fmt(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 font-semibold">
                    <span>Tax (GST 5%)</span>
                    <span className="text-white">{fmt(totals.tax)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Coupon Discount</span>
                      <span>-{fmt(totals.discount)}</span>
                    </div>
                  )}
                  <div className="pt-2.5 border-t border-slate-800 flex justify-between items-baseline font-black text-sm">
                    <span>Net Payable</span>
                    <span className="text-amber-400 text-lg font-black">{fmt(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* UPI QR Payment Section */}
              <div className="bg-slate-900/80 border border-slate-850 rounded-3xl p-5 space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="text-white font-black text-xs uppercase tracking-wider">Scan & Pay via UPI QR</h4>
                  <p className="text-slate-500 text-[10px] font-medium">Scan the QR code below using GPay, PhonePe, Paytm, or any UPI app.</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 w-48 h-48 mx-auto shadow-inner relative overflow-hidden">
                  {config?.upiQrImage ? (
                    <img src={config.upiQrImage} alt="UPI Merchant QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <span className="text-3xl mb-1">📲</span>
                      <span className="text-[10px] font-bold text-center text-slate-500">Scan QR Code</span>
                      <span className="text-[8px] text-slate-400 mt-1 font-mono">{config?.upiId || 'cafe@upi'}</span>
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-slate-400 text-xs font-bold">Amount to Pay</p>
                  <p className="text-amber-400 text-2xl font-black">{fmt(totals.total)}</p>
                  {config?.upiId && (
                    <p className="text-slate-500 text-[10px] font-mono select-all">UPI ID: {config.upiId}</p>
                  )}
                </div>

                {/* Reference / UTR Input Field */}
                <div className="space-y-2 border-t border-slate-850 pt-4">
                  <label htmlFor="transaction-ref" className="text-slate-400 text-[10px] font-black uppercase tracking-wider block ml-1">
                    UPI Transaction ID / Ref No (UTR)
                  </label>
                  <input
                    id="transaction-ref"
                    name="payment_ref"
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                    placeholder="Enter 12-digit UTR/Ref number"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-700 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none transition-colors"
                  />
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed px-1">
                    Enter the 12-digit Ref No / UTR number from your UPI app transaction summary after successful payment.
                  </p>
                </div>
              </div>

            </div>

            {/* Error notifications */}
            {submitError && (
              <div className="mx-4 mb-2 bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold p-3 rounded-xl text-center">
                {submitError}
              </div>
            )}

            {/* Pay Now Footer Button */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex-shrink-0">
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting}
                className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isVerifyingPayment
                  ? '⏳ Verifying UPI payment with bank...'
                  : submitting
                    ? '⏳ Processing Order...'
                    : `✅ Confirm Payment of ${fmt(totals.total)}`
                }
              </button>
              <p className="text-center text-[10px] text-slate-500 mt-2.5 font-medium">
                Order is sent directly to the kitchen upon payment confirmation.
              </p>
            </div>
          </div>
        )}

        {/* Coupon validation overlay popup dialog */}
        {showCouponDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs relative-mobile-modal" style={{ position: 'absolute' }}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-[88%] p-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <h4 className="text-white font-extrabold text-sm">Enter Coupon Code</h4>
                <button
                  onClick={() => setShowCouponDialog(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <XIcon />
                </button>
              </div>

              <div className="space-y-4">
                <label htmlFor="coupon-input" className="sr-only">Coupon code</label>
                <input
                  id="coupon-input"
                  name="coupon_code"
                  type="text"
                  placeholder="Enter a coupon code (e.g. WELCOME10)"
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-xs font-bold uppercase focus:outline-none transition-colors"
                />

                {/* Quick Select Buttons */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Quick selection coupons</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('WELCOME10')}
                      className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-amber-500 text-slate-300 text-xs font-extrabold rounded-xl text-left flex justify-between items-center transition-colors"
                    >
                      <span>🎟️ 10% Discount</span>
                      <span className="text-amber-500 text-[10px] font-black uppercase font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">WELCOME10</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('FLAT50')}
                      className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-amber-500 text-slate-300 text-xs font-extrabold rounded-xl text-left flex justify-between items-center transition-colors"
                    >
                      <span>🎟️ Flat ₹50 Discount</span>
                      <span className="text-amber-500 text-[10px] font-black uppercase font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">FLAT50</span>
                    </button>
                  </div>
                </div>

                {couponError && (
                  <p className="text-red-400 text-[10px] font-bold text-center bg-red-500/5 p-2 rounded-lg border border-red-500/15">
                    ⚠️ {couponError}
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={applyingCoupon || !couponInput}
                  className="flex-1 py-3 bg-amber-500 text-slate-950 font-black text-xs rounded-xl hover:bg-amber-400 active:scale-95 disabled:bg-slate-800 disabled:text-slate-650 transition-colors"
                >
                  {applyingCoupon ? 'Applying...' : 'Apply Coupon'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCouponDialog(false)}
                  className="px-4 py-3 bg-slate-850 text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: ORDER CONFIRMATION SCREEN ── */}
        {phase === 'confirmed' && (
          <div className="flex-1 flex flex-col justify-between p-6 pb-12 relative z-10 animate-in zoom-in-95 duration-300">
            <div className="text-center pt-16 my-auto space-y-6">
              
              {/* Big Success Circle Mark */}
              <div className="w-24 h-24 mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-5xl shadow-xl shadow-emerald-500/10 animate-pulse">
                ✓
              </div>

              <div className="space-y-2">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Payment Successful</p>
                <h1 className="text-2xl font-black text-white tracking-tight">Order Confirmed!</h1>
                <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                  Payment received! Your order has been sent directly to the kitchen and is being prepared.
                </p>
              </div>

              {/* Order Info Badge */}
              <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl max-w-sm mx-auto space-y-2.5 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimated Order Identifier</p>
                  <p className="text-amber-500 font-black text-xl tracking-tight mt-0.5">#{trackedOrderId}</p>
                </div>
                <div className="w-8 h-px bg-slate-850 mx-auto" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Amount Paid</p>
                  <p className="text-white font-extrabold text-sm mt-0.5">{fmt(totals.total)}</p>
                </div>
                {customerName && (
                  <div className="pt-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Customer</p>
                    <p className="text-white font-extrabold text-sm mt-0.5">{customerName}{customerPhone ? ` • ${customerPhone}` : ''}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Track My Order button */}
            <div className="space-y-3">
              {orderReceipt && (
                <button
                  onClick={handlePrintReceipt}
                  className="w-full py-4 bg-slate-800 text-amber-400 font-black text-sm rounded-2xl border border-amber-500/20 flex items-center justify-center gap-2"
                >
                  🧾 View / Print Bill
                </button>
              )}
              <button
                onClick={() => setPhase('tracker')}
                className="w-full py-4.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl hover:from-amber-400 hover:to-orange-400 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                🍳 Track My Order
              </button>
              <button
                onClick={handleResetFlow}
                className="w-full py-3.5 bg-slate-850 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl border border-slate-800"
              >
                Back to Welcome Page
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: ORDER STATUS TRACKER SCREEN ── */}
        {phase === 'tracker' && (
          <div className="flex-1 flex flex-col min-h-0 relative z-10 animate-in slide-in-from-right-4 duration-300">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between">
              <h3 className="text-white font-black text-base">Order Tracking Monitor</h3>
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-black">
                Live Status
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Header Details */}
              <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Order ID</p>
                  <p className="text-amber-500 font-extrabold text-sm mt-0.5">#{trackedOrderId}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Dining Location</p>
                  <p className="text-white font-extrabold text-sm mt-0.5">Table {tableInfo?.table_number}</p>
                  {trackedOrderData?.customer_name && (
                    <p className="text-slate-400 text-xs mt-1">{trackedOrderData.customer_name}{trackedOrderData.customer_phone ? ` • ${trackedOrderData.customer_phone}` : ''}</p>
                  )}
                </div>
              </div>

              {/* Live Polling Status Circle */}
              {!trackedOrderData ? (
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-8 h-8 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Retrieving status update from kitchen...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Big current KDS status indicator */}
                  <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-3xl text-center space-y-4">
                    <span className="text-5xl block animate-pulse">
                      {KDS_ICONS[trackedOrderData.kds_status] || '📋'}
                    </span>
                    <div>
                      <h4 className="text-white font-black text-lg">
                        {KDS_LABELS[trackedOrderData.kds_status] || trackedOrderData.kds_status}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Kitchen status updates automatically in real-time.
                      </p>
                    </div>

                    {/* Progress Bar indicator */}
                    <div className="space-y-2 pt-2">
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                          style={{
                            width:
                              trackedOrderData.kds_status === 'To Cook'
                                ? '30%'
                                : trackedOrderData.kds_status === 'Preparing'
                                ? '65%'
                                : '100%'
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">
                        <span className={trackedOrderData.kds_status === 'To Cook' ? 'text-amber-500 font-black' : ''}>Received</span>
                        <span className={trackedOrderData.kds_status === 'Preparing' ? 'text-amber-500 font-black' : ''}>Preparing</span>
                        <span className={trackedOrderData.kds_status === 'Completed' ? 'text-emerald-400 font-black' : ''}>Completed</span>
                      </div>
                    </div>
                  </div>

                  {/* KDS status list check items */}
                  <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-3">
                    <h5 className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Preparation checklist</h5>
                    {trackedOrderData.items && trackedOrderData.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            trackedOrderData.kds_status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                          }`} />
                          <span className="font-semibold">{item.quantity}x {item.product_name}</span>
                        </div>
                        <span className="font-extrabold text-[10px] text-slate-500">{fmt(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="pt-2.5 border-t border-slate-800 flex justify-between items-baseline text-xs font-black">
                      <span className="text-slate-400">Total Charged</span>
                      <span className="text-amber-400 text-sm">{fmt(trackedOrderData.total_amount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Back action button */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex-shrink-0">
              <button
                onClick={handleResetFlow}
                className="w-full py-4 bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-xs rounded-2xl border border-slate-750"
              >
                Back to Welcome Page
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Tailwind and layout helper styles */}
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        /* Modal within the mobile frame context */
        .relative-mobile-modal {
          position: absolute !important;
          border-radius: 0 0 3rem 3rem;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .relative-mobile-modal {
            position: fixed !important;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
