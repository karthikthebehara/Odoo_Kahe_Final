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
    key:   'to_cook',
    label: 'To Cook',
    icon:  '🔥',
    color: '#f59e0b',
    ring:  'ring-amber-500/40',
    badge: 'bg-amber-500',
    header: 'from-amber-600 to-amber-500',
  },
  {
    key:   'preparing',
    label: 'Preparing',
    icon:  '👨‍🍳',
    color: '#6366f1',
    ring:  'ring-indigo-500/40',
    badge: 'bg-indigo-500',
    header: 'from-indigo-600 to-indigo-500',
  },
  {
    key:   'completed',
    label: 'Completed',
    icon:  '✅',
    color: '#22c55e',
    ring:  'ring-emerald-500/40',
    badge: 'bg-emerald-500',
    header: 'from-emerald-700 to-emerald-500',
  },
];

const NEXT_STAGE = {
  to_cook:   'preparing',
  preparing: 'completed',
  completed: null,
};

// Mock data removed in favour of live API
// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════
function elapsed(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
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
      className={`w-full text-left flex items-center gap-2.5 py-1.5 px-2 rounded-lg
                  transition-all duration-150 group
        ${done ? 'opacity-40' : 'hover:bg-white/5'}`}
    >
      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center
                       transition-all duration-150
        ${done
          ? 'bg-emerald-500 border-emerald-500'
          : 'border-gray-600 group-hover:border-gray-400'}`}>
        {done && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <span className={`text-sm flex-1 transition-all ${done ? 'line-through text-gray-600' : 'text-gray-200'}`}>
        {item.product_name}
      </span>
      <span className={`text-xs font-bold flex-shrink-0 ${done ? 'text-gray-600' : 'text-white'}`}>
        ×{item.quantity}
      </span>
    </button>
  );
}

// ── Ticket card ───────────────────────────────────────────────────────────────
function TicketCard({ order, stage, onAdvance, onToggleItem }) {
  const age = useElapsed(order.created_at);
  const allDone = order.items.every(i => i.kds_status === 'completed');
  const next = NEXT_STAGE[order.status];

  const isUrgent = stage.key === 'to_cook' &&
    (Date.now() - new Date(order.created_at)) > 10 * 60 * 1000;

  return (
    <div
      onClick={() => next && onAdvance(order.id, next)}
      className={`bg-gray-800/80 border rounded-2xl overflow-hidden shadow-md
                  transition-all duration-200 cursor-pointer select-none
                  hover:shadow-xl hover:scale-[1.01] ring-1
                  ${isUrgent ? 'border-red-500/50 ring-red-500/20 animate-pulse-slow' : `border-gray-700/60 ${stage.ring}`}
                  ${next ? 'active:scale-[0.99]' : 'cursor-default'}`}
    >
      {/* Ticket header */}
      <div className={`bg-gradient-to-r ${stage.header} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">{order.order_number}</span>
          {order.table_label && (
            <span className="text-white/70 text-xs bg-white/10 px-1.5 py-0.5 rounded-md">
              {order.table_label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold ${isUrgent ? 'text-red-200' : 'text-white/70'}`}>
            {age}
          </span>
          {next && (
            <div className="text-white/60 text-xs border border-white/20 px-1.5 py-0.5 rounded-lg
                            hover:border-white/50 transition-colors">
              → {STAGES.find(s => s.key === next)?.label}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-0.5" onClick={e => e.stopPropagation()}>
        {order.items.map(item => (
          <TicketItem
            key={item.id}
            item={item}
            onToggle={(itemId) => onToggleItem(order.id, itemId)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-gray-500 text-xs">{order.items.length} items</span>
        {allDone && next && (
          <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
              <polyline points="1.5,5 4,7.5 8.5,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            All done — tap to advance
          </span>
        )}
        {!next && (
          <span className="text-emerald-400 text-xs font-semibold">✓ Served</span>
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
      const data = await kdsAPI.list().catch(() => null);
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
              status: nextStatus,
              items: o.items.map(i => ({
                ...i,
                kds_status: nextStatus === 'completed' ? 'completed' : i.kds_status,
              })),
            }
          : o
      )
    );
    try {
      await kdsAPI.updateStatus(orderId, nextStatus);
    } catch { /* optimistic UI — revert on repeated failure if needed */ }
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
    try {
      const item = orders.flatMap(o => o.items).find(i => i.id === itemId);
      if (item) {
        await kdsAPI.updateItem(orderId, itemId, item.kds_status === 'completed' ? false : true);
      }
    } catch { /* optimistic */ }
  }, [orders]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.order_number.toLowerCase().includes(q)
      || (o.table_label || '').toLowerCase().includes(q)
      || o.items.some(i => i.product_name.toLowerCase().includes(q));
  });

  const byStage = Object.fromEntries(
    STAGES.map(s => [s.key, filtered.filter(o => o.status === s.key)])
  );

  // ── Elapsed sync label ──────────────────────────────────────────────────
  const syncLabel = useElapsed(lastSync.toISOString());

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">

      {/* ── KDS Header ─────────────────────────────────────────────────── */}
      <header className="bg-gray-900/95 border-b border-gray-800 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-lg">
            🍳
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Kitchen Display</h1>
            <p className="text-gray-500 text-xs">Last sync: {syncLabel} ago</p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2 ml-4">
          {STAGES.map(s => (
            <div
              key={s.key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: `${s.color}18`,
                border: `1px solid ${s.color}35`,
                color: s.color,
              }}
            >
              <span>{s.icon}</span>
              <span>{byStage[s.key]?.length || 0}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="ml-auto relative w-64">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order / product…"
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl
                       px-4 py-2 pl-9 focus:outline-none focus:border-amber-500 transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchOrders}
          className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700
                     flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </header>

      {/* ── 3-column board ─────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
        {STAGES.map((stage, colIdx) => (
          <div
            key={stage.key}
            className={`flex flex-col overflow-hidden p-5
              ${colIdx < STAGES.length - 1 ? 'border-r border-gray-800/60' : ''}`}
          >
            {/* Column header strip */}
            <div
              className="flex items-center gap-2.5 mb-4 pb-3 border-b flex-shrink-0"
              style={{ borderColor: `${stage.color}30` }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: `${stage.color}20` }}
              >
                {stage.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base">{stage.label}</h3>
                <p className="text-gray-500 text-xs">{byStage[stage.key]?.length} tickets</p>
              </div>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                style={{ backgroundColor: stage.color }}
              >
                {byStage[stage.key]?.length || 0}
              </div>
            </div>

            {/* Scrollable ticket list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {byStage[stage.key]?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-700">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3"
                    style={{ backgroundColor: `${stage.color}12` }}
                  >
                    {stage.icon}
                  </div>
                  <p className="text-sm font-medium text-gray-600">No orders</p>
                  <p className="text-xs text-gray-700 mt-1">
                    {stage.key === 'to_cook' ? 'Waiting for new orders…'
                      : stage.key === 'preparing' ? 'Nothing in progress'
                      : 'No completed orders yet'}
                  </p>
                </div>
              )}

              {byStage[stage.key]?.map(order => (
                <TicketCard
                  key={order.id}
                  order={order}
                  stage={stage}
                  onAdvance={handleAdvance}
                  onToggleItem={handleToggleItem}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
