/**
 * frontend/src/pages/Kds.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Kitchen Display System (KDS)
 *
 * 3-column Kanban: To Cook → Preparing → Completed
 * • Clicking a ticket card advances the whole order to next stage
 * • Clicking an individual item marks that item as completed (strikethrough)
 * • Real-time polling every 10 s (WebSocket upgrade path left as comment)
 * • Search bar + category/product filter
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { kdsAPI } from '../utils/api';

// ═══════════════════════════════════════════════════════════════════════════════
// Types / constants
// ═══════════════════════════════════════════════════════════════════════════════
const STAGES = [
  {
    key:   'To Cook',
    label: 'To Cook',
    icon:  '🔥',
    color: '#f59e0b',
    ring:  'ring-amber-500/40',
    badge: 'bg-amber-500',
    header: 'from-amber-600 to-amber-500',
  },
  {
    key:   'Preparing',
    label: 'Preparing',
    icon:  '👨‍🍳',
    color: '#6366f1',
    ring:  'ring-indigo-500/40',
    badge: 'bg-indigo-500',
    header: 'from-indigo-600 to-indigo-500',
  },
  {
    key:   'Completed',
    label: 'Completed',
    icon:  '✅',
    color: '#22c55e',
    ring:  'ring-emerald-500/40',
    badge: 'bg-emerald-500',
    header: 'from-emerald-700 to-emerald-500',
  },
];

const NEXT_STAGE = {
  'To Cook':   'Preparing',
  'Preparing': 'Completed',
  'Completed': null,
};

// Mock data removed in favour of live API
// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════
function elapsed(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 0) return '0s';
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
}

function useElapsed(iso) {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceRender(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return elapsed(iso);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

// ── Ticket item row ───────────────────────────────────────────────────────────
function TicketItem({ item, onToggle }) {
  const done = item.kds_status === 'completed';
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
      className={`w-full text-left flex items-center gap-2.5 py-2 px-3 rounded-xl
                  transition-all duration-150 group
        ${done ? 'opacity-40' : 'hover:bg-[#C2A688]/5'}`}
    >
      <div className={`w-4 h-4 rounded-md border flex-shrink-0 flex items-center justify-center
                       transition-all duration-150
        ${done
          ? 'bg-[#4B6043] border-[#4B6043]'
          : 'border-[#C2A688]/30 group-hover:border-[#C2A688]/60'}`}>
        {done && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <span className={`text-sm flex-1 transition-all font-medium ${done ? 'line-through text-[#C2A688]/30' : 'text-white'}`}>
        {item.product_name}
      </span>
      <span className={`text-xs font-bold flex-shrink-0 ${done ? 'text-[#C2A688]/30' : 'text-[#C2A688]'}`}>
        ×{item.quantity}
      </span>
    </button>
  );
}

// ── Ticket card ───────────────────────────────────────────────────────────────
function TicketCard({ order, stage, onAdvance, onToggleItem }) {
  const age = useElapsed(order.created_at);
  const allDone = order.items.every(i => i.kds_status === 'completed');
  const next = NEXT_STAGE[order.kds_status];

  const isUrgent = stage.key === 'To Cook' &&
    (Date.now() - new Date(order.created_at)) > 10 * 60 * 1000;

  return (
    <div
      onClick={() => next && onAdvance(order.id, next)}
      className={`bg-gradient-to-br from-[#ffffff]/4 to-[#ffffff]/1 border rounded-2xl overflow-hidden shadow-lg
                  transition-all duration-200 backdrop-blur-sm select-none
                  ${next ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'}
                  ${isUrgent 
                    ? 'border-[#D07A56]/50 ring-1 ring-[#D07A56]/20 animate-pulse-slow' 
                    : `border-[#C2A688]/20 ring-1 ${stage.ring}`}`}
    >
      {/* Header */}
      <div 
        className={`p-4 text-white font-black text-sm flex items-center justify-between`}
        style={{
          background: `linear-gradient(135deg, ${stage.color}30 0%, ${stage.color}15 100%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-base font-black shadow-md">
            #{order.id}
          </div>
          {order.table_label && (
            <span className="text-white/70 text-xs bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/10">
              🪑 {order.table_label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold tracking-wider ${isUrgent ? 'text-[#D07A56]' : 'text-white/60'}`}>
            {age}
          </span>
          {next && (
            <div className="text-white/60 text-xs border border-white/20 px-2 py-1 rounded-lg
                            hover:border-white/50 hover:text-white/80 transition-colors font-semibold">
              → {STAGES.find(s => s.key === next)?.label}
            </div>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="px-4 py-3 space-y-1 border-b border-[#C2A688]/10" onClick={e => e.stopPropagation()}>
        {order.items.map(item => (
          <TicketItem
            key={item.id}
            item={item}
            onToggle={(itemId) => onToggleItem(order.id, itemId)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between text-xs">
        <span className="text-[#C2A688]/50 font-semibold">{order.items.length} items</span>
        {allDone && next && (
          <span className="text-[#4B6043] font-bold flex items-center gap-1.5 bg-[#4B6043]/10 px-2.5 py-1 rounded-lg border border-[#4B6043]/20">
            <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
              <polyline points="1.5,5 4,7.5 8.5,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Ready to advance
          </span>
        )}
        {!next && (
          <span className="text-[#4B6043] font-bold flex items-center gap-1.5 bg-[#4B6043]/10 px-2.5 py-1 rounded-lg border border-[#4B6043]/20">✓ Served</span>
        )}
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════════
// MAIN KDS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Kds() {
  const [orders,  setOrders]  = useState([]);
  const [search,  setSearch]  = useState('');
  const [lastSync, setLastSync] = useState(new Date());
  const pollRef = useRef(null);

  // ── Load orders from API ────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await kdsAPI.list().catch(() => null);
      const data = res?.data || res;
      if (data && Array.isArray(data)) {
        setOrders(data);
        setLastSync(new Date());
      }
    } catch (err) {
      console.error('Failed to sync KDS', err);
    }
  }, []);

  // Poll every 3 s
  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, 3_000);
    return () => clearInterval(pollRef.current);
  }, [fetchOrders]);

  // ── Advance whole order ─────────────────────────────────────────────────
  const handleAdvance = useCallback(async (orderId, nextStatus) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              kds_status: nextStatus,
              items: o.items.map(i => ({
                ...i,
                kds_status: nextStatus === 'Completed' ? 'completed' : i.kds_status,
              })),
            }
          : o
      )
    );
    try {
      await kdsAPI.updateStatus(orderId, nextStatus);
    } catch (err) {
      console.error('[KDS] Failed to advance order status:', err);
    }
  }, []);

  // ── Toggle individual item ──────────────────────────────────────────────
  const handleToggleItem = useCallback(async (orderId, itemId) => {
    setOrders(prev =>
      prev.map(o => o.id === orderId ? {
        ...o,
        items: o.items.map(i =>
          i.id === itemId
            ? { ...i, kds_status: i.kds_status === 'completed' ? 'pending' : 'completed' }
            : i
        ),
      } : o)
    );
    // Removed API call because the current backend schema does not track item completion state
  }, []);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (o.id ? o.id.toString() : '').includes(q)
      || (o.table_label || '').toLowerCase().includes(q)
      || o.items.some(i => i.product_name.toLowerCase().includes(q));
  });

  const byStage = Object.fromEntries(
    STAGES.map(s => [s.key, filtered.filter(o => o.kds_status === s.key)])
  );

  // ── Elapsed sync label ──────────────────────────────────────────────────
  const syncLabel = useElapsed(lastSync.toISOString());

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen bg-gradient-to-br from-[#0f0e0c] via-[#1a1512] to-[#0f0e0c] flex flex-col overflow-hidden">
      
      {/* ── KDS Header ─────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-gradient-to-r from-[#1a110b]/95 to-[#2a1f18]/95 backdrop-blur-lg border-b border-[#C2A688]/10 px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#D07A56] to-[#C2A688] rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-[#D07A56]/30">
            🍳
          </div>
          <div>
            <h1 className="text-white font-black text-lg leading-tight tracking-tight">Kitchen Display System</h1>
            <p className="text-[#C2A688]/60 text-xs font-semibold uppercase tracking-wider">Last sync: {syncLabel} ago</p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3 ml-6">
          {STAGES.map(s => (
            <div
              key={s.key}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide backdrop-blur-sm border transition-all"
              style={{
                backgroundColor: `${s.color}12`,
                borderColor: `${s.color}35`,
                color: s.color,
              }}
            >
              <span className="text-lg">{s.icon}</span>
              <span className="font-black">{byStage[s.key]?.length || 0}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative hidden md:block w-56">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order / product…"
              className="w-full bg-[#ffffff]/5 border border-[#C2A688]/20 text-white text-sm rounded-xl
                         px-4 py-2.5 pl-10 placeholder-[#C2A688]/40 focus:outline-none focus:border-[#C2A688]/50 focus:ring-1 focus:ring-[#C2A688]/30 transition-all duration-200"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C2A688]/40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>

          <button
            onClick={fetchOrders}
            className="w-10 h-10 rounded-lg bg-[#C2A688]/10 hover:bg-[#C2A688]/20 border border-[#C2A688]/20 hover:border-[#C2A688]/40
                       flex items-center justify-center text-[#C2A688] hover:text-[#D07A56] transition-all duration-200 font-bold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── 3-column Kanban board ─────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-6 min-h-0 overflow-hidden">
        {STAGES.map((stage) => (
          <div
            key={stage.key}
            className="flex flex-col bg-gradient-to-b from-[#ffffff]/3 to-[#ffffff]/1 border border-[#C2A688]/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl min-h-0"
          >
            {/* Column header */}
            <div
              className="flex-shrink-0 px-6 py-5 border-b border-[#C2A688]/10"
              style={{
                background: `linear-gradient(135deg, ${stage.color}15 0%, ${stage.color}08 100%)`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-md"
                    style={{ backgroundColor: `${stage.color}20` }}
                  >
                    {stage.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-black text-base tracking-tight">{stage.label}</h3>
                    <p className="text-[#C2A688]/50 text-xs font-semibold">{byStage[stage.key]?.length || 0} tickets</p>
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg"
                  style={{ backgroundColor: stage.color }}
                >
                  {byStage[stage.key]?.length || 0}
                </div>
              </div>
            </div>

            {/* Scrollable tickets area */}
            <div className="flex-1 overflow-y-auto space-y-3 p-4">
              {byStage[stage.key]?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-md"
                    style={{ backgroundColor: `${stage.color}12` }}
                  >
                    {stage.icon}
                  </div>
                  <p className="text-[#C2A688]/40 text-sm font-semibold">No orders in {stage.label}</p>
                  <p className="text-[#C2A688]/20 text-xs mt-1">Waiting for new tickets…</p>
                </div>
              ) : (
                byStage[stage.key]?.map(order => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    stage={stage}
                    onAdvance={handleAdvance}
                    onToggleItem={handleToggleItem}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
