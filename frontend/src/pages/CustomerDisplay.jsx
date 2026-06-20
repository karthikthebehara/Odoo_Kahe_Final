import React, { useState, useEffect } from 'react';

// Elegant SVG Icons
const Icons = {
  Coffee: () => (
    <svg className="w-16 h-16 text-amber-500 animate-bounce" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  )
};

export default function CustomerDisplay() {
  const [data, setData] = useState({
    state: 'CART', // 'CART' | 'PAYMENT' | 'THANK_YOU'
    cart: {
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
    }
  });

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
      <div className="w-5/12 bg-[#0d1527]/90 border-r border-slate-800/80 flex flex-col justify-between p-12 relative overflow-hidden">
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
      <div className="w-7/12 flex flex-col justify-between p-12 bg-[#070b19] relative">
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

        {/* State B: UPI QR Payment */}
        {data.state === 'PAYMENT' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
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
              
              {/* SVG QR Code */}
              <div className="w-56 h-56 bg-white rounded-2xl p-4 flex items-center justify-center shadow-lg relative">
                {/* Simulated high-quality QR vector representation */}
                <svg className="w-full h-full text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                  {/* Outer markers */}
                  <rect x="0" y="0" width="30" height="30" />
                  <rect x="5" y="5" width="20" height="20" fill="white" />
                  <rect x="10" y="10" width="10" height="10" />

                  <rect x="70" y="0" width="30" height="30" />
                  <rect x="75" y="5" width="20" height="20" fill="white" />
                  <rect x="80" y="10" width="10" height="10" />

                  <rect x="0" y="70" width="30" height="30" />
                  <rect x="5" y="75" width="20" height="20" fill="white" />
                  <rect x="10" y="80" width="10" height="10" />

                  {/* Random QR code noise clusters for a highly authentic feel */}
                  <rect x="40" y="5" width="5" height="15" />
                  <rect x="50" y="10" width="10" height="5" />
                  <rect x="45" y="20" width="15" height="10" />
                  <rect x="5" y="40" width="15" height="5" />
                  <rect x="0" y="50" width="10" height="15" />
                  <rect x="15" y="60" width="15" height="5" />
                  
                  <rect x="40" y="40" width="20" height="20" />
                  <rect x="45" y="45" width="10" height="10" fill="white" />
                  <rect x="75" y="40" width="10" height="20" />
                  <rect x="90" y="45" width="10" height="10" />
                  <rect x="70" y="70" width="15" height="5" />
                  <rect x="75" y="80" width="20" height="10" />
                  <rect x="40" y="80" width="15" height="15" />
                  <rect x="60" y="90" width="10" height="10" />
                </svg>

                {/* Tiny Coffee Icon in the middle of QR for a premium look */}
                <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-lg shadow-md border-2 border-white">
                  ☕
                </div>
              </div>

              {/* Text overlay showing Grand Total */}
              <div className="mt-6 text-center">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Amount Due</p>
                <p className="text-3xl font-black text-white tracking-tight mt-1">{fmt(data.cart.total)}</p>
              </div>
            </div>

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
