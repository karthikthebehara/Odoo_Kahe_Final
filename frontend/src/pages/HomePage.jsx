/**
 * frontend/src/pages/HomePage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Public-facing Cafe Landing Page for Odoo Café POS
 * Sections: Hero · Stats · About · Menu · Features · Gallery · Testimonials · CTA · Footer
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ── Smooth scroll hook ────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Counter animation ─────────────────────────────────────────────────────────
function useCounter(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return [count, ref];
}

// ── Data ─────────────────────────────────────────────────────────────────────
const MENU_ITEMS = [
  { emoji: '☕', name: 'Signature Espresso', desc: 'Rich & bold single-origin shots with a caramel finish', price: '₹180', tag: 'Bestseller', tagColor: '#C2A688' },
  { emoji: '🥛', name: 'Oat Milk Latte', desc: 'Silky smooth oat milk with perfectly extracted espresso', price: '₹220', tag: 'Popular', tagColor: '#4B6043' },
  { emoji: '🍵', name: 'Matcha Ceremonial', desc: 'Grade-A ceremonial matcha whisked to perfection', price: '₹260', tag: 'New', tagColor: '#D07A56' },
  { emoji: '🧁', name: 'Almond Croissant', desc: 'Buttery, flaky layers filled with almond frangipane', price: '₹140', tag: 'Fresh', tagColor: '#C2A688' },
  { emoji: '🍰', name: 'Tiramisu Slice', desc: 'Classic Italian dessert with house-made mascarpone', price: '₹190', tag: 'Chef\'s Pick', tagColor: '#D07A56' },
  { emoji: '🥗', name: 'Avocado Toast', desc: 'Sourdough with smashed avo, poached egg & micro herbs', price: '₹280', tag: 'Healthy', tagColor: '#4B6043' },
];

const FEATURES = [
  { icon: '🖥️', title: 'Smart POS Terminal', desc: 'Blazing-fast order entry with category filters, product search, and real-time cart management.' },
  { icon: '🍳', title: 'Kitchen Display', desc: '3-stage Kanban (To Cook → Preparing → Completed) keeps your kitchen perfectly in sync.' },
  { icon: '📊', title: 'Live Reporting', desc: 'Revenue trends, top products, category breakdowns — all updating in real time with custom date filters.' },
  { icon: '📱', title: 'QR Self-Ordering', desc: 'Customers scan their table QR to browse the menu and place orders directly without staff assistance.' },
  { icon: '💳', title: 'Flexible Payments', desc: 'Cash, Card, and UPI QR code payments — with receipt printing and email delivery built in.' },
  { icon: '🎟️', title: 'Coupons & Promos', desc: 'Coupon codes and automated promotions that trigger on product quantity or order value thresholds.' },
];

const GALLERY = [
  { img: '/gallery-latte.png',   emoji: '☕', label: 'Espresso Bar',     color: 'from-amber-900/70 to-cafe-espresso/80' },
  { img: '/gallery-pastry.png',  emoji: '🥐', label: 'Bakery Counter',  color: 'from-orange-900/70 to-cafe-espresso/80' },
  { img: '/gallery-garden.png',  emoji: '🌿', label: 'Garden Terrace', color: 'from-green-900/70 to-cafe-espresso/80' },
  { img: '/cafe-hero.png',       emoji: '🎵', label: 'Jazz Evenings',   color: 'from-purple-900/70 to-cafe-espresso/80' },
  { img: '/gallery-latte.png',   emoji: '📖', label: 'Reading Nook',    color: 'from-blue-900/70 to-cafe-espresso/80' },
  { img: '/gallery-pastry.png',  emoji: '🍰', label: 'Dessert Display', color: 'from-pink-900/70 to-cafe-espresso/80' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Cafe Owner, Bangalore', quote: 'The POS terminal transformed our operations. Orders fly through during peak hours and the kitchen screen keeps our team perfectly in sync.', avatar: 'PS', color: '#C2A688' },
  { name: 'Rahul Mehta', role: 'Franchisee, Mumbai', quote: 'The reporting dashboard alone is worth it. I know exactly which products are driving revenue and can adjust the menu accordingly.', avatar: 'RM', color: '#D07A56' },
  { name: 'Ananya Iyer', role: 'Head Barista, Chennai', quote: 'The Kitchen Display is a game-changer. No more shouting orders across the counter — everything is clear and organised on the screen.', avatar: 'AI', color: '#4B6043' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function NavBar({ scrolled }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-cafe-espresso/95 backdrop-blur-md shadow-2xl border-b border-cafe-latte/10' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cafe-latte to-cafe-terracotta rounded-xl flex items-center justify-center text-xl shadow-lg">
            ☕
          </div>
          <div>
            <p className="text-cafe-cream font-black text-lg leading-none font-serif">Odoo Café</p>
            <p className="text-cafe-cream/40 text-[10px] uppercase tracking-widest font-semibold">POS System</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {['menu', 'features', 'gallery', 'about'].map(section => (
            <button
              key={section}
              onClick={() => scrollTo(section)}
              className="text-cafe-cream/60 hover:text-cafe-cream text-sm font-semibold transition-colors capitalize tracking-wide"
            >
              {section}
            </button>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-cafe-cream/70 hover:text-cafe-latte text-sm font-bold transition-colors">
            Sign In
          </Link>
          <Link
            to="/pos"
            className="bg-cafe-terracotta hover:bg-opacity-90 text-white text-sm font-black px-5 py-2.5 rounded-xl transition-all hover:scale-105 shadow-lg"
          >
            Open POS →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-cafe-cream/80 p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {menuOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-cafe-espresso/98 backdrop-blur-md border-t border-transparent px-6 py-4 space-y-3">
          {['menu', 'features', 'gallery', 'about'].map(section => (
            <button
              key={section}
              onClick={() => scrollTo(section)}
              className="block w-full text-left text-cafe-cream/70 hover:text-cafe-latte text-sm font-semibold py-2 capitalize transition-colors"
            >
              {section}
            </button>
          ))}
          <div className="pt-3 flex gap-3">
            <Link to="/login" className="flex-1 text-center text-cafe-cream/70 border border-transparent rounded-xl py-2.5 text-sm font-bold">Sign In</Link>
            <Link to="/pos" className="flex-1 text-center bg-cafe-terracotta text-white rounded-xl py-2.5 text-sm font-black">Open POS</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function StatItem({ target, suffix = '', label }) {
  const [count, ref] = useCounter(target);
  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl font-black text-cafe-latte font-serif">{count}{suffix}</p>
      <p className="text-cafe-cream/50 text-sm mt-1 font-medium">{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState('All');

  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const menuCategories = ['All', 'Coffee', 'Food', 'Desserts'];
  const filteredMenu = MENU_ITEMS.filter(item => {
    if (activeMenu === 'All') return true;
    if (activeMenu === 'Coffee') return ['☕', '🥛', '🍵'].includes(item.emoji);
    if (activeMenu === 'Food') return ['🥗'].includes(item.emoji);
    if (activeMenu === 'Desserts') return ['🧁', '🍰'].includes(item.emoji);
    return true;
  });

  return (
    <>
      {/* Scroll-reveal CSS */}
      <style>{`
        .reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.is-visible { opacity: 1; transform: translateY(0); }
        .reveal-left { opacity: 0; transform: translateX(-32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal-left.is-visible { opacity: 1; transform: translateX(0); }
        .reveal-right { opacity: 0; transform: translateX(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal-right.is-visible { opacity: 1; transform: translateX(0); }
        .stagger-1 { transition-delay: 0.1s; }
        .stagger-2 { transition-delay: 0.2s; }
        .stagger-3 { transition-delay: 0.3s; }
        .stagger-4 { transition-delay: 0.4s; }
        .stagger-5 { transition-delay: 0.5s; }
        .stagger-6 { transition-delay: 0.6s; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .float-anim { animation: float 4s ease-in-out infinite; }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .shimmer-text {
          background: linear-gradient(90deg, #C2A688 0%, #FDFBF7 40%, #D07A56 70%, #C2A688 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .card-hover:hover { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .menu-tab.active { background: rgba(194,166,136,0.15); color: #C2A688; border-color: rgba(194,166,136,0.4); }
      `}</style>

      <div className="min-h-screen bg-cafe-espresso text-cafe-cream font-sans">
        <NavBar scrolled={scrolled} />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* HERO                                                                  */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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

          <div className="relative z-20 text-center px-6 max-w-5xl mx-auto pt-24">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-cafe-latte/10 border border-cafe-latte/20 px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 bg-cafe-latte rounded-full animate-pulse" />
              <span className="text-cafe-latte text-xs font-bold uppercase tracking-widest">Premium Cafe POS Platform</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black leading-none mb-6">
              <span className="shimmer-text">Craft.</span>{' '}
              <span className="text-cafe-cream">Serve.</span>{' '}
              <span className="shimmer-text">Thrive.</span>
            </h1>

            <p className="text-cafe-cream/60 text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed mb-12">
              A complete Point-of-Sale ecosystem built for artisanal cafés — from the espresso bar
              to the kitchen display to your accounting dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/pos"
                className="group flex items-center gap-2 bg-cafe-terracotta hover:bg-opacity-90 text-white font-black text-base px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105"
              >
                <span>🖥️</span>
                Open POS Terminal
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <Link
                to="/admin"
                className="flex items-center gap-2 bg-[#bfa180]/5 hover:bg-[#bfa180]/10 border border-transparent text-cafe-cream font-bold text-base px-8 py-4 rounded-2xl transition-all backdrop-blur-sm"
              >
                <span>📊</span>
                Admin Dashboard
              </Link>
            </div>

            {/* Floating coffee cup */}
            <div className="mt-20 float-anim text-8xl md:text-9xl opacity-20 select-none pointer-events-none">
              ☕
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-cafe-cream/30">
            <span className="text-xs uppercase tracking-widest font-semibold">Scroll</span>
            <div className="w-5 h-9 border-2 border-cafe-cream/20 rounded-full flex items-start justify-center p-1">
              <div className="w-1.5 h-2.5 bg-cafe-latte/60 rounded-full animate-bounce" />
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* STATS BAR                                                             */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="border-y border-cafe-latte/10 bg-[#bfa180]/5 py-14">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem target={500} suffix="+" label="Orders Processed Daily" />
            <StatItem target={98} suffix="%" label="Customer Satisfaction" />
            <StatItem target={3} suffix="s" label="Avg. Order Time" />
            <StatItem target={24} suffix="/7" label="System Uptime" />
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* ABOUT                                                                 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="about" className="py-28 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            {/* Left: Visual card stack */}
            <div className="relative reveal reveal-left">
              <div className="absolute inset-0 bg-cafe-latte/5 rounded-3xl blur-3xl scale-110" />
              <div className="relative grid grid-cols-2 gap-4">
                {[
                  { emoji: '☕', label: 'Espresso Craft', sub: 'Premium beans' },
                  { emoji: '🍳', label: 'Kitchen Sync', sub: 'Real-time KDS' },
                  { emoji: '📊', label: 'Live Reports', sub: 'Instant insights' },
                  { emoji: '🎟️', label: 'Smart Promos', sub: 'Auto-triggered' },
                ].map((card, i) => (
                  <div
                    key={i}
                    className={`bg-[#bfa180]/5 border border-transparent rounded-2xl p-6 card-hover stagger-${i + 1}`}
                  >
                    <div className="text-4xl mb-3">{card.emoji}</div>
                    <p className="text-cafe-cream font-bold text-sm">{card.label}</p>
                    <p className="text-cafe-cream/40 text-xs mt-1">{card.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Text */}
            <div className="reveal reveal-right">
              <span className="text-cafe-latte text-xs font-black uppercase tracking-widest">Our Story</span>
              <h2 className="text-4xl md:text-5xl font-black mt-3 mb-6 leading-tight font-serif">
                Built for cafés that{' '}
                <span className="text-cafe-latte">care about craft</span>
              </h2>
              <p className="text-cafe-cream/60 text-lg leading-relaxed mb-6">
                Odoo Café POS was designed from the ground up for artisanal coffee shops and
                independent cafés. Every feature — from the lightning-fast POS terminal to the
                kitchen display to the analytics dashboard — was built with your workflow in mind.
              </p>
              <p className="text-cafe-cream/60 leading-relaxed mb-8">
                Whether you're managing one location or scaling to multiple outlets, our platform
                grows with you. Empower your baristas, keep your kitchen humming, and delight
                every customer — one perfect cup at a time.
              </p>
              <div className="flex flex-wrap gap-3">
                {['Full-Stack POS', 'Role-Based Access', 'Real-Time KDS', 'QR Self-Order', 'PDF Exports'].map(tag => (
                  <span key={tag} className="bg-cafe-latte/10 border border-cafe-latte/20 text-cafe-latte text-xs font-bold px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* MENU                                                                  */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="menu" className="py-28 px-6 bg-[#1A110B]/50">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 reveal">
              <span className="text-cafe-latte text-xs font-black uppercase tracking-widest">Our Menu</span>
              <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 font-serif">
                Curated with <span className="text-cafe-terracotta">passion</span>
              </h2>
              <p className="text-cafe-cream/50 text-lg max-w-xl mx-auto">
                Every item on our menu is crafted with seasonal ingredients and artisanal techniques.
              </p>
            </div>

            {/* Category tabs */}
            <div className="flex items-center justify-center gap-2 mb-10 flex-wrap reveal">
              {menuCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveMenu(cat)}
                  className={`menu-tab px-5 py-2.5 rounded-xl text-sm font-bold border transition-all duration-200 ${activeMenu === cat ? 'active' : 'text-cafe-cream/50 border-transparent hover:border-white/20 hover:text-cafe-cream/80'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenu.map((item, i) => (
                <div
                  key={item.name}
                  className={`reveal stagger-${Math.min(i + 1, 6)} bg-[#bfa180]/5 hover:bg-[#bfa180]/8 border border-transparent hover:border-cafe-latte/20 rounded-3xl p-6 card-hover group cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cafe-latte/20 to-cafe-terracotta/20 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300">
                      {item.emoji}
                    </div>
                    <span
                      className="text-xs font-black px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${item.tagColor}20`, color: item.tagColor, border: `1px solid ${item.tagColor}40` }}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-cafe-cream font-bold text-lg mb-2 group-hover:text-cafe-latte transition-colors">{item.name}</h3>
                  <p className="text-cafe-cream/50 text-sm leading-relaxed mb-4">{item.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-cafe-latte font-black text-xl">{item.price}</span>
                    <button className="w-8 h-8 bg-cafe-terracotta/20 hover:bg-cafe-terracotta text-cafe-terracotta hover:text-white rounded-lg flex items-center justify-center transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10 reveal">
              <Link
                to="/s/demo"
                className="inline-flex items-center gap-2 border border-cafe-latte/30 text-cafe-latte hover:bg-cafe-latte/10 font-bold px-6 py-3 rounded-xl transition-all"
              >
                View Full Menu via QR Order
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* FEATURES                                                              */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="features" className="py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 reveal">
              <span className="text-cafe-terracotta text-xs font-black uppercase tracking-widest">Platform Features</span>
              <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 font-serif">
                Everything you need to{' '}
                <span className="text-cafe-latte">run your café</span>
              </h2>
              <p className="text-cafe-cream/50 text-lg max-w-2xl mx-auto">
                From order entry to kitchen management to analytics — the full stack, beautifully integrated.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature, i) => (
                <div
                  key={feature.title}
                  className={`reveal stagger-${Math.min(i + 1, 6)} group bg-[#bfa180]/5 hover:bg-[#bfa180]/8 border border-transparent hover:border-cafe-terracotta/20 rounded-3xl p-7 card-hover`}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-cafe-terracotta/20 to-cafe-latte/20 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-cafe-cream font-bold text-lg mb-3 group-hover:text-cafe-latte transition-colors font-serif">
                    {feature.title}
                  </h3>
                  <p className="text-cafe-cream/50 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* GALLERY                                                               */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="gallery" className="py-28 px-6 bg-[#1A110B]/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 reveal">
              <span className="text-cafe-latte text-xs font-black uppercase tracking-widest">Gallery</span>
              <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 font-serif">
                Moments that <span className="text-cafe-terracotta">matter</span>
              </h2>
              <p className="text-cafe-cream/50 text-lg max-w-xl mx-auto">
                Spaces designed for connection, craftsmanship, and community.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {GALLERY.map((item, i) => (
                <div
                  key={item.label}
                  className={`reveal stagger-${Math.min(i + 1, 6)} relative group overflow-hidden rounded-2xl aspect-square card-hover`}
                >
                  {/* Real photo background */}
                  {item.img && (
                    <img
                      src={item.img}
                      alt={item.label}
                      className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-110 transition-transform duration-700"
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} z-10 group-hover:opacity-60 transition-opacity duration-300`} />
                  {/* Content */}
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                    <span className="text-5xl md:text-6xl group-hover:scale-110 transition-all duration-500 filter drop-shadow-lg opacity-80 group-hover:opacity-0">
                      {item.emoji}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <div className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2">
                      <p className="text-white text-xs font-bold tracking-wide">{item.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TESTIMONIALS                                                          */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 reveal">
              <span className="text-cafe-terracotta text-xs font-black uppercase tracking-widest">Testimonials</span>
              <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 font-serif">
                Trusted by café <span className="text-cafe-latte">operators</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.name}
                  className={`reveal stagger-${i + 1} bg-[#bfa180]/5 border border-transparent rounded-3xl p-7 card-hover relative overflow-hidden`}
                >
                  {/* Big quote mark */}
                  <div className="absolute top-4 right-6 text-7xl text-white/5 font-serif leading-none select-none">"</div>

                  <p className="text-cafe-cream/70 text-sm leading-relaxed mb-6 italic">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-cafe-cream font-bold text-sm">{t.name}</p>
                      <p className="text-cafe-cream/40 text-xs">{t.role}</p>
                    </div>
                  </div>
                  {/* Stars */}
                  <div className="flex gap-0.5 mt-4">
                    {[...Array(5)].map((_, s) => (
                      <svg key={s} className="w-4 h-4 text-cafe-latte" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* CTA BANNER                                                            */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="py-20 px-6 bg-[#1A110B]/60">
          <div className="max-w-4xl mx-auto text-center reveal">
            <div className="bg-gradient-to-br from-cafe-latte/10 via-transparent to-cafe-terracotta/10 border border-cafe-latte/10 rounded-[2.5rem] p-14">
              <div className="text-6xl mb-6">☕</div>
              <h2 className="text-4xl md:text-5xl font-black mb-4 font-serif">
                Ready to transform your <span className="text-cafe-latte">café experience</span>?
              </h2>
              <p className="text-cafe-cream/60 text-lg mb-10 max-w-xl mx-auto">
                Launch the POS terminal, open the admin dashboard, or let your customers self-order
                via QR code — all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/pos"
                  className="flex items-center gap-2 bg-cafe-terracotta hover:bg-opacity-90 text-white font-black text-base px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105"
                >
                  🖥️ Launch POS Terminal
                </Link>
                <Link
                  to="/admin"
                  className="flex items-center gap-2 bg-[#bfa180]/5 hover:bg-[#bfa180]/10 border border-transparent text-cafe-cream font-bold text-base px-8 py-4 rounded-2xl transition-all"
                >
                  📊 Go to Admin Dashboard
                </Link>
                <Link
                  to="/kds"
                  className="flex items-center gap-2 bg-[#bfa180]/5 hover:bg-[#bfa180]/10 border border-transparent text-cafe-cream/70 font-bold text-base px-8 py-4 rounded-2xl transition-all"
                >
                  🍳 Kitchen Display
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* FOOTER                                                                */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <footer className="py-16 px-6 border-t border-cafe-latte/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-cafe-latte to-cafe-terracotta rounded-xl flex items-center justify-center text-xl">
                    ☕
                  </div>
                  <div>
                    <p className="text-cafe-cream font-black text-lg font-serif">Odoo Café POS</p>
                    <p className="text-cafe-cream/40 text-xs uppercase tracking-widest">Premium Platform</p>
                  </div>
                </div>
                <p className="text-cafe-cream/50 text-sm leading-relaxed max-w-xs">
                  A complete Point-of-Sale ecosystem for modern cafés — built with passion, engineered for scale.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <p className="text-cafe-cream/80 font-bold text-sm uppercase tracking-wider mb-4">Quick Access</p>
                <div className="space-y-2.5">
                  {[
                    { label: '🖥️ POS Terminal', to: '/pos' },
                    { label: '📊 Admin Dashboard', to: '/admin' },
                    { label: '🍳 Kitchen Display', to: '/kds' },
                    { label: '🔑 Sign In', to: '/login' },
                    { label: '👤 Sign Up', to: '/signup' },
                  ].map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="block text-cafe-cream/50 hover:text-cafe-latte text-sm font-medium transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <p className="text-cafe-cream/80 font-bold text-sm uppercase tracking-wider mb-4">Platform</p>
                <div className="space-y-2.5">
                  {['Order Management', 'Kitchen Display', 'Reporting & Analytics', 'QR Self-Ordering', 'Coupon System', 'Payment Processing'].map(f => (
                    <p key={f} className="text-cafe-cream/50 text-sm">{f}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-cafe-latte/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-cafe-cream/30 text-xs">
                © 2026 Odoo Café POS. Crafted with ☕ and ❤️ for artisanal cafés.
              </p>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-1.5 text-xs text-cafe-cream/30">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  All Systems Operational
                </span>
                <span className="text-cafe-cream/20 text-xs">v2.0.0</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
