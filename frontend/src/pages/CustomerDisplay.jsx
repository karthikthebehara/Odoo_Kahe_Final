import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

// Elegant SVG Icons
const Icons = {
  Coffee: () => (
    <svg className="w-16 h-16 text-amber-500 animate-bounce" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z M6 2v2M10 2v2M14 2v2" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-24 h-24 text-emerald-500 mx-auto animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ShoppingBag: () => (
    <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  QrCode: () => (
    <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13.5H16.5V15H15V13.5zM16.5 15H18V16.5H16.5V15zM15 16.5H16.5V18H15V16.5zM18 13.5H19.5V15H18V13.5zM19.5 15H21V16.5H19.5V15zM18 16.5H19.5V18H18V16.5zM13.5 13.5H15V15H13.5V13.5zM13.5 15H15V16.5H13.5V15zM13.5 16.5H15V18H13.5V16.5z" />
    </svg>
  ),
  Card: () => (
    <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Cash: () => (
    <svg className="w-16 h-16 text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
};

export default function CustomerDisplay() {
  const [data, setData] = useState({
    state: 'CART', // 'CART' | 'PAYMENT' | 'THANK_YOU'
    paymentMethod: 'cash',
    upiId: '',
    cart: {
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
    }
  });
  const [upiQrUrl, setUpiQrUrl] = useState('');

  // Generate real UPI QR Code when state is PAYMENT and paymentMethod is upi
  useEffect(() => {
    if (data.state === 'PAYMENT' && data.paymentMethod === 'upi') {
      const upiLink = `upi://pay?pa=${encodeURIComponent(data.upiId || 'cafe@upi')}&pn=${encodeURIComponent('Odoo Cafe')}&am=${data.cart.total}&cu=INR`;
      QRCode.toDataURL(upiLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(url => setUpiQrUrl(url))
      .catch(err => console.error('[CustomerDisplay] QR generation error:', err));
    }
  }, [data.state, data.paymentMethod, data.cart.total, data.upiId]);

  useEffect(() => {
    // 1. Initial load from localStorage
    const saved = localStorage.getItem('odoo_customer_display_state');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error('[CustomerDisplay] Error parsing initial storage state:', e);
      }
    }

    // 2. Listen to BroadcastChannel for instant same-origin updates
    const bc = new BroadcastChannel('odoo_customer_display');
    bc.onmessage = (event) => {
      if (event.data) {
        setData(event.data);
      }
    };

    // 3. Listen to window storage events as fallback
    const handleStorage = (e) => {
      if (e.key === 'odoo_customer_display_state' && e.newValue) {
        try {
          setData(JSON.parse(e.newValue));
        } catch (err) {
          console.error('[CustomerDisplay] Storage parsing error:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

  return (
    <div className="h-screen w-screen bg-[#070b19] text-slate-100 flex overflow-hidden font-sans select-none">
      
      {/* ==========================================
          LEFT SIDE COLUMN (Fixed Brand Display)
         ========================================== */}
      <div className="w-5/12 bg-[#0d1527]/90 border-r border-slate-800/80 flex flex-col justify-between p-6 lg:p-12 relative overflow-hidden">
        {/* Subtle decorative glowing background gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-80 h-80 rounded-full bg-amber-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 rounded-full bg-blue-500/10 blur-[70px] pointer-events-none" />

        {/* Top: Logo */}
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-3xl font-black text-slate-950">
            ☕
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Odoo Café</h1>
            <p className="text-slate-500 text-xs font-bold tracking-wider">Premium Experience</p>
          </div>
        </div>

        {/* Middle: Welcome Message */}
        <div className="my-auto z-10">
          <span className="text-amber-500 text-xs font-extrabold uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
            Now Serving
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mt-6 tracking-tight">
            Welcome to <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Odoo Café
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-4 max-w-sm leading-relaxed font-medium">
            Please watch this screen for your order details, total amounts, and payment scan options in real-time.
          </p>
        </div>

        {/* Bottom: Footer */}
        <div className="flex items-center gap-2 text-slate-600 text-xs font-bold z-10">
          <span>Powered by</span>
          <span className="text-slate-400 tracking-wider font-extrabold uppercase">Odoo Cafe POS</span>
        </div>
      </div>

      {/* ==========================================
          RIGHT SIDE COLUMN (Dynamic States)
         ========================================== */}
      <div className="w-7/12 flex flex-col justify-between p-6 lg:p-12 bg-[#070b19] relative">
        {/* State A: Cart Active */}
        {data.state === 'CART' && (
          <>
            {data.cart.items.length === 0 ? (
              /* State A - Empty Cart Screensaver */
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                <Icons.ShoppingBag />
                <h3 className="text-2xl font-black text-white tracking-tight">Ready for your order</h3>
                <p className="text-slate-500 text-sm max-w-sm mt-3 leading-relaxed font-medium">
                  Add items at the register to see your real-time subtotal, tax discounts, and invoice details here.
                </p>
                <div className="mt-8 flex gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Awaiting Cashier Input</span>
                </div>
              </div>
            ) : (
              /* State A - Active Cart List */
              <div className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between pb-6 border-b border-slate-800/80">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    🛒 Active Cart
                  </h3>
                  <span className="bg-amber-500/10 text-amber-400 text-[10px] font-extrabold border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                    {data.cart.items.reduce((acc, item) => acc + item.qty, 0)} Items Added
                  </span>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto my-6 space-y-3 pr-2 scrollbar-thin">
                  {data.cart.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-800/50 hover:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between transition-all duration-150">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-slate-800/80 rounded-xl flex items-center justify-center text-lg font-black border border-slate-700/40">
                          {item.qty}x
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm tracking-tight">{item.name}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{fmt(item.price)} each</p>
                        </div>
                      </div>
                      <div className="text-white font-extrabold text-sm tracking-tight">
                        {fmt(item.price * item.qty)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Summary Footer */}
                <div className="flex-shrink-0 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="space-y-2 text-xs font-semibold text-slate-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-slate-200">{fmt(data.cart.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST Tax</span>
                      <span className="text-slate-200">{fmt(data.cart.tax)}</span>
                    </div>
                    {data.cart.discount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Discount Coupon</span>
                        <span>-{fmt(data.cart.discount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-sm font-extrabold text-white">Grand Total</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent tracking-tight">
                      {fmt(data.cart.total)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* State B: Payment Request Screen */}
        {data.state === 'PAYMENT' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
            {data.paymentMethod === 'upi' ? (
              <>
                {/* Payment Header */}
                <div className="mb-6">
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                    Payment Request
                  </span>
                  <h3 className="text-3xl font-black text-white mt-4 tracking-tight">Scan UPI to Pay</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs font-medium">Please scan the secure QR code using any UPI app (GPay, PhonePe, Paytm, BHIM)</p>
                </div>

                {/* UPI QR Container */}
                <div className="relative bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center max-w-sm w-full overflow-hidden">
                  {/* Scan Bar Glow Animation */}
                  <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 animate-scan pointer-events-none opacity-80" />
                  
                  {/* Real QR Code */}
                  <div className="w-56 h-56 bg-white rounded-2xl p-4 flex items-center justify-center shadow-lg relative">
                    {upiQrUrl ? (
                      <img src={upiQrUrl} alt="UPI QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-6 h-6 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
                        <span className="text-slate-400 text-xs font-bold">Generating QR...</span>
                      </div>
                    )}
                  </div>

                  {/* Text overlay showing Grand Total */}
                  <div className="mt-6 text-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Amount Due</p>
                    <p className="text-3xl font-black text-white tracking-tight mt-1">{fmt(data.cart.total)}</p>
                  </div>
                </div>
              </>
            ) : data.paymentMethod === 'card' ? (
              <>
                {/* Payment Header */}
                <div className="mb-6">
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                    Payment Request
                  </span>
                  <h3 className="text-3xl font-black text-white mt-4 tracking-tight">Swipe or Tap Card</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs font-medium">Please insert, swipe, or tap your credit/debit card on the payment terminal</p>
                </div>

                {/* Card terminal view */}
                <div className="relative bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-12 shadow-2xl flex flex-col items-center justify-center max-w-sm w-full overflow-hidden">
                  <Icons.Card />
                  <div className="mt-6 text-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Amount Due</p>
                    <p className="text-3xl font-black text-white tracking-tight mt-1">{fmt(data.cart.total)}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Payment Header */}
                <div className="mb-6">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                    Payment Request
                  </span>
                  <h3 className="text-3xl font-black text-white mt-4 tracking-tight">Pay Cash at Counter</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs font-medium">Please hand the cash amount to the cashier at the register</p>
                </div>

                {/* Cash view */}
                <div className="relative bg-slate-900 border-2 border-emerald-500/30 rounded-3xl p-12 shadow-2xl flex flex-col items-center justify-center max-w-sm w-full overflow-hidden">
                  <Icons.Cash />
                  <div className="mt-6 text-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Amount Due</p>
                    <p className="text-3xl font-black text-white tracking-tight mt-1">{fmt(data.cart.total)}</p>
                  </div>
                </div>
              </>
            )}

            {/* Processing State */}
            <div className="mt-8 flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-slate-400 text-xs font-bold tracking-wide">Waiting for Cashier confirmation...</span>
            </div>
          </div>
        )}

        {/* State C: Thank You Screen */}
        {data.state === 'THANK_YOU' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
            <Icons.CheckCircle />
            
            <h3 className="text-4xl font-black text-white tracking-tight mt-8">
              Payment Successful!
            </h3>
            
            <p className="text-amber-500 text-sm font-extrabold uppercase tracking-widest mt-2">
              Thank you for shopping with us
            </p>
            
            <p className="text-slate-400 text-sm max-w-sm mt-4 leading-relaxed font-medium">
              Your order has been recorded and sent to the kitchen. Please collect your receipt at the counter. See you again!
            </p>

            {/* Glowing circle animation background */}
            <div className="absolute w-96 h-96 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
          </div>
        )}

      </div>

      {/* Embed Tailwind Scanner Animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
