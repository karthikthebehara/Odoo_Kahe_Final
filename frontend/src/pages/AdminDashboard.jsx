import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, {
  categoriesAPI,
  productsAPI,
  paymentMethodsAPI,
  couponsAPI,
  employeesAPI,
  reportsAPI,
  sessionsAPI,
  tablesAPI
} from '../utils/api';
import { SalesAreaChart, CategoryPieChart } from '../components/admin/ReportsCharts';
import { 
  Calculator, 
  FileEdit, 
  ExternalLink, 
  User as UserIcon, 
  Menu, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  Calendar
} from 'lucide-react';

const NAV = [
  { icon: '📊', label: 'Reports',            path: '/admin/reports' },
  { icon: '📦', label: 'Products',           path: '/admin/products' },
  { icon: '🏷️', label: 'Categories',         path: '/admin/categories' },
  { icon: '💳', label: 'Payment Methods',    path: '/admin/payments' },
  { icon: '🎟️', label: 'Coupon & Promotion', path: '/admin/coupons' },
  { icon: '📅', label: 'Tables & Floors',    path: '/admin/bookings' },
  { icon: '👥', label: 'Users / Employees',  path: '/admin/users' },
  { icon: '⚙️', label: 'Mobile Order Panel',  path: '/admin/settings' },
  { icon: '📱', label: 'Table QR Codes',     path: '/admin/qrcodes' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const currentPath = location.pathname;


  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex font-sans antialiased text-gray-200">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-amber-500/10">
              ☕
            </div>
            <div>
              <p className="text-white font-extrabold text-sm tracking-tight">Odoo Cafe POS</p>
              <p className="text-gray-500 text-xs font-semibold">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => navigate('/admin')}
            className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all text-sm font-semibold ${
              currentPath === '/admin' || currentPath === '/admin/'
                ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <span className="text-lg">🏠</span> Dashboard Overview
          </button>

          {NAV.map(item => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all text-sm font-semibold ${
                  isActive
                    ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-gray-800 space-y-2 flex-shrink-0">
          <button
            onClick={() => navigate('/pos')}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-amber-400 border border-gray-700 hover:border-gray-600 transition-colors text-xs font-bold"
          >
            🖥️ Open POS Terminal
          </button>
          <button
            onClick={() => navigate('/kds')}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-orange-400 border border-gray-700 hover:border-gray-600 transition-colors text-xs font-bold"
          >
            🍳 Open Kitchen Monitor
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/10 hover:border-red-500/20 transition-colors text-xs font-semibold"
          >
            🚪 Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top header bar */}
        <header className="flex-shrink-0 h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-900/40">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            <span>Admin</span>
            <span>/</span>
            <span className="text-gray-300">
              {currentPath === '/admin' || currentPath === '/admin/'
                ? 'Dashboard'
                : NAV.find(n => n.path === currentPath)?.label || 'Overview'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs font-semibold">Active Session:</span>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-full text-xs font-bold">
              Admin Mode
            </span>
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white text-xs">
              {user?.name?.charAt(0)}
            </div>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-950">
          {currentPath === '/admin' || currentPath === '/admin/' ? (
            <DashboardOverview navigate={navigate} />
          ) : currentPath === '/admin/reports' ? (
            <ReportsPanel />
          ) : currentPath === '/admin/products' ? (
            <ProductsPanel />
          ) : currentPath === '/admin/categories' ? (
            <CategoriesPanel />
          ) : currentPath === '/admin/payments' ? (
            <PaymentMethodsPanel />
          ) : currentPath === '/admin/coupons' ? (
            <PromotionsPanel />
          ) : currentPath === '/admin/bookings' ? (
            <BookingsPanel />
          ) : currentPath === '/admin/users' ? (
            <EmployeesPanel />
          ) : currentPath === '/admin/settings' ? (
            <MobileOrderPanel />
          ) : currentPath === '/admin/qrcodes' ? (
            // eslint-disable-next-line no-undef
            <TableQRCodesPanel />
          ) : (
            <div className="text-center py-12 text-gray-500">View not found</div>
          )}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBPATH VIEW PANELS
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardOverview({ navigate }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">System Administration Overview</h1>
        <p className="text-gray-400 mt-1">Select an administrative area from the sidebar or click a shortcut below to begin configuring the café.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {NAV.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="bg-gray-900/60 hover:bg-gray-900 border border-gray-800/80 hover:border-amber-500/40 rounded-2xl p-6 text-left transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="text-white font-extrabold text-sm group-hover:text-amber-400 transition-colors">{item.label}</h3>
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">Click to launch the directory control pane for this module.</p>
          </button>
        ))}
      </div>

      <div className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-amber-500/5">
        <div>
          <h2 className="text-white font-extrabold text-lg">Launch Point-of-Sale Shift</h2>
          <p className="text-gray-400 text-sm mt-1">Open the cashier terminal interface to start checkout sessions and record sales.</p>
        </div>
        <button
          onClick={() => navigate('/pos')}
          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-black rounded-2xl shadow-xl shadow-amber-500/25 transition-all hover:scale-105"
        >
          Open POS Cashier →
        </button>
      </div>
    </div>
  );
}

// ── PRODUCTS PANEL ────────────────────────────────────────────────────────────
function ProductsPanel() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Form Fields
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uom, setUom] = useState('unit');
  const [tax, setTax] = useState('5.00');
  const [desc, setDesc] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([productsAPI.list(), categoriesAPI.list()]);
      setProducts(p || []);
      setCategories(c || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProducts = useMemo(() => {
    const s = search.toLowerCase();
    return products.filter(p => {
      const matchQ = p.name.toLowerCase().includes(s);
      const matchC = !catFilter || p.category_id === Number(catFilter);
      return matchQ && matchC;
    });
  }, [products, search, catFilter]);

  const handleEdit = (p) => {
    setEditId(p.id);
    setName(p.name);
    setPrice(p.price);
    setCategoryId(p.category_id || '');
    setUom(p.uom);
    setTax(p.tax);
    setDesc(p.description || '');
    setIsAvailable(p.is_available === 1 || p.is_available === true);
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !price) { setError('Name and Price are required.'); return; }
    setError('');
    const data = {
      name,
      price: parseFloat(price),
      category_id: categoryId ? Number(categoryId) : null,
      uom,
      tax: parseFloat(tax),
      description: desc || null,
      is_available: isAvailable
    };

    try {
      if (editId) {
        await productsAPI.update(editId, data);
      } else {
        await productsAPI.create(data);
      }
      loadData();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save product.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsAPI.delete(id);
      loadData();
    } catch (err) {
      alert('Failed to delete product: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setPrice('');
    setCategoryId('');
    setUom('unit');
    setTax('5.00');
    setDesc('');
    setIsAvailable(true);
    setFormOpen(false);
    setError('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Menu Products CRUD</h1>
          <p className="text-gray-400 text-xs mt-0.5">Manage products catalog, prices, and categories</p>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-sm"
        >
          + Add New Product
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-lg p-8 space-y-4 animate-in zoom-in-95 duration-200">
            <h2 className="text-white font-bold text-lg">{editId ? 'Edit Product' : 'Add New Product'}</h2>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Product Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price (₹)"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="UoM (e.g. unit, slice, cup)"
                  value={uom}
                  onChange={e => setUom(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Tax GST (%)"
                  value={tax}
                  onChange={e => setTax(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <textarea
                placeholder="Product Description"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors h-24 resize-none"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="avail"
                  checked={isAvailable}
                  onChange={e => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-gray-850 border-gray-700"
                />
                <label htmlFor="avail" className="text-sm text-gray-300">Available for Sale</label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-all">
                Save Product
              </button>
              <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="text"
          placeholder="Search products by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-800 text-white text-xs rounded-xl px-4 py-3.5 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white text-xs rounded-xl px-4 py-3.5 focus:outline-none focus:border-amber-500 transition-colors sm:w-48"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-gray-900 border border-gray-800/80 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading products catalog...</div>
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950/40 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-850">
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-center">Tax / UoM</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850 text-xs">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-800/20 text-gray-300">
                    <td className="px-6 py-4 font-bold text-white">{p.name}</td>
                    <td className="px-6 py-4 text-gray-400">{p.category_name || 'Unassigned'}</td>
                    <td className="px-6 py-4 text-right text-amber-400 font-extrabold">₹{Number(p.price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center text-gray-500 font-medium">
                      {p.tax}% GST / {p.uom}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${p.is_available === 1 || p.is_available === true ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {p.is_available === 1 || p.is_available === true ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => handleEdit(p)} className="text-amber-500 hover:text-amber-400 font-bold transition-colors">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-400 font-bold transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 text-sm">No products found.</div>
        )}
      </div>
    </div>
  );
}

// ── CATEGORIES PANEL ──────────────────────────────────────────────────────────
function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3498db');
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesAPI.list();
      setCategories(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name) { setError('Category Name is required.'); return; }
    setError('');
    try {
      if (editId) {
        await categoriesAPI.update(editId, { name, color });
      } else {
        await categoriesAPI.create({ name, color });
      }
      setName('');
      setColor('#3498db');
      setEditId(null);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to save category.');
    }
  };

  const handleEdit = (c) => {
    setEditId(c.id);
    setName(c.name);
    setColor(c.color || '#3498db');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category and its product relations?')) return;
    try {
      await categoriesAPI.delete(id);
      loadCategories();
    } catch (err) {
      alert('Failed to delete category: ' + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
      {/* Category Editor */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 h-fit space-y-4 shadow-lg">
        <h2 className="text-white font-extrabold text-base">{editId ? 'Edit Category' : 'Create Category'}</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}
          
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Category Name</label>
            <input
              type="text"
              placeholder="e.g. Cold Coffee, Croissants"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Theme Color Picker</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-12 h-10 bg-gray-800 border border-gray-750 p-1.5 rounded-xl cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#3498db"
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-all text-xs">
              {editId ? 'Update Category' : 'Create Category'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => { setEditId(null); setName(''); setColor('#3498db'); }}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-750 text-white font-semibold rounded-xl transition-all text-xs"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Categories List */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-2xl font-black text-white">Menu Categories CRUD</h1>
          <p className="text-gray-400 text-xs mt-0.5">Define categories and color themes for the POS grid</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="text-center py-12 text-gray-500 text-sm">Loading categories...</div>
          ) : categories.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950/40 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-850">
                  <th className="px-6 py-4">Theme Color</th>
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850 text-xs">
                {categories.map(c => (
                  <tr key={c.id} className="hover:bg-gray-800/20 text-gray-300">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md border border-gray-750 shadow-md" style={{ backgroundColor: c.color }} />
                        <span className="font-mono text-gray-500 text-[10px] uppercase font-bold">{c.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => handleEdit(c)} className="text-amber-500 hover:text-amber-400 font-bold transition-colors">Edit</button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-400 font-bold transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">No categories configured.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PAYMENT METHODS PANEL ─────────────────────────────────────────────────────
function PaymentMethodsPanel() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Form Fields
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('cash');
  const [isEnabled, setIsEnabled] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');

  const loadMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentMethodsAPI.list();
      setMethods(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  const handleEdit = (pm) => {
    setEditId(pm.id);
    setName(pm.name);
    setType(pm.type);
    setIsEnabled(pm.is_enabled === 1 || pm.is_enabled === true);
    setUpiId(pm.upi_id || '');
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !type) { setError('Name and Type are required.'); return; }
    setError('');
    const data = {
      name,
      type,
      is_enabled: isEnabled,
      upi_id: type === 'upi' ? upiId : null
    };

    try {
      if (editId) {
        await paymentMethodsAPI.update(editId, data);
      } else {
        await paymentMethodsAPI.create(data);
      }
      loadMethods();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save payment method.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment method?')) return;
    try {
      await paymentMethodsAPI.delete(id);
      loadMethods();
    } catch (err) {
      alert('Failed to delete payment method: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setType('cash');
    setIsEnabled(true);
    setUpiId('');
    setFormOpen(false);
    setError('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Payment Method Setup</h1>
          <p className="text-gray-400 text-xs mt-0.5">Toggle cash, credit card, or configure merchant UPI QR details</p>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-sm"
        >
          + Add Payment Method
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-md p-8 space-y-4 animate-in zoom-in-95 duration-200">
            <h2 className="text-white font-bold text-lg">{editId ? 'Edit Payment Method' : 'Add Payment Method'}</h2>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Method Name (e.g. Cash, Credit/Debit Card, UPI)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="cash">Cash Register</option>
                <option value="card">Card Reader/POS</option>
                <option value="upi">UPI QR Merchant</option>
              </select>

              {type === 'upi' && (
                <input
                  type="text"
                  placeholder="Merchant UPI ID (e.g. cafe@upi)"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="availpm"
                  checked={isEnabled}
                  onChange={e => setIsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-gray-850 border-gray-700"
                />
                <label htmlFor="availpm" className="text-sm text-gray-300">Enable this payment option</label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-all">
                Save Method
              </button>
              <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-gray-500">Loading payment methods...</div>
        ) : methods.length > 0 ? (
          methods.map(pm => (
            <div
              key={pm.id}
              className={`bg-gray-900 border rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden ${pm.is_enabled ? 'border-gray-800' : 'border-gray-800 opacity-60'}`}
            >
              <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">
                    {pm.type === 'cash' ? '💵' : pm.type === 'card' ? '💳' : '📱'}
                  </span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${pm.is_enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {pm.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-base tracking-tight">{pm.name}</h3>
                  <p className="text-gray-500 text-xs mt-1 capitalize font-medium">Type: {pm.type}</p>
                  {pm.type === 'upi' && pm.upi_id && (
                    <div className="mt-3 bg-gray-950/60 border border-gray-850 px-3.5 py-2 rounded-xl text-center">
                      <p className="text-gray-500 text-[10px] font-bold">MERCHANT UPI ID</p>
                      <p className="text-amber-500 text-xs font-bold font-mono mt-0.5">{pm.upi_id}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t border-gray-850">
                <button
                  onClick={() => handleEdit(pm)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-750 text-white font-bold rounded-xl transition-all text-xs"
                >
                  Configure
                </button>
                <button
                  onClick={() => handleDelete(pm.id)}
                  className="px-3.5 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/10 rounded-xl transition-all"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12 text-gray-500">No payment methods configured.</div>
        )}
      </div>
    </div>
  );
}

// ── COUPON & PROMOTION PANEL ──────────────────────────────────────────────────
function PromotionsPanel() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Form Fields
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('coupon');
  const [discountType, setDiscountType] = useState('percentage');
  const [value, setValue] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [productId, setProductId] = useState('');
  const [minQty, setMinQty] = useState('');
  const [minAmt, setMinAmt] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [promos, prods] = await Promise.all([couponsAPI.list(), productsAPI.list()]);
      setPromotions(promos || []);
      setProducts(prods || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEdit = (p) => {
    setEditId(p.id);
    setName(p.name);
    setType(p.type);
    setDiscountType(p.discount_type);
    setValue(p.value);
    setCouponCode(p.coupon_code || '');
    setProductId(p.product_id || '');
    setMinQty(p.min_quantity || '');
    setMinAmt(p.min_order_amount || '');
    setStartDate(p.start_date ? p.start_date.split('T')[0] : '');
    setEndDate(p.end_date ? p.end_date.split('T')[0] : '');
    setIsActive(p.is_active === 1 || p.is_active === true);
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || value === '') { setError('Name and Value are required.'); return; }
    setError('');
    
    const data = {
      name,
      type,
      discount_type: discountType,
      value: parseFloat(value),
      coupon_code: type === 'coupon' ? couponCode.trim().toUpperCase() : null,
      product_id: type === 'automated_product' && productId ? Number(productId) : null,
      min_quantity: type === 'automated_product' && minQty ? Number(minQty) : null,
      min_order_amount: type === 'automated_order' && minAmt ? parseFloat(minAmt) : null,
      start_date: startDate || null,
      end_date: endDate || null,
      is_active: isActive
    };

    try {
      if (editId) {
        await couponsAPI.update(editId, data);
      } else {
        await couponsAPI.create(data);
      }
      loadData();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save promotion.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promotion rule?')) return;
    try {
      await couponsAPI.delete(id);
      loadData();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setType('coupon');
    setDiscountType('percentage');
    setValue('');
    setCouponCode('');
    setProductId('');
    setMinQty('');
    setMinAmt('');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setFormOpen(false);
    setError('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Coupons & Promotions CRUD</h1>
          <p className="text-gray-400 text-xs mt-0.5">Configure discounts: manual coupons, line volume deals, or spend thresholds</p>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-sm"
        >
          + Create Discount Rule
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-md p-8 space-y-4 animate-in zoom-in-95 duration-200">
            <h2 className="text-white font-bold text-lg">{editId ? 'Edit Discount Rule' : 'Create Discount Rule'}</h2>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <input
                type="text"
                placeholder="Promo Rule Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="coupon">Manual Coupon Code</option>
                  <option value="automated_product">Automated Product (Line)</option>
                  <option value="automated_order">Automated Order (Cart)</option>
                </select>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount (₹)</option>
                </select>
              </div>

              <input
                type="number"
                step="0.01"
                placeholder="Discount Value"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />

              {type === 'coupon' && (
                <input
                  type="text"
                  placeholder="Coupon Code Code (e.g. FLAT50)"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors font-mono uppercase"
                />
              )}

              {type === 'automated_product' && (
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={productId}
                    onChange={e => setProductId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Min Quantity (Qty >= X)"
                    value={minQty}
                    onChange={e => setMinQty(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              )}

              {type === 'automated_order' && (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Min Order Amount (Subtotal >= ₹X)"
                  value={minAmt}
                  onChange={e => setMinAmt(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-500 text-[10px] font-bold">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-500 text-[10px] font-bold">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="availpromo"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-gray-850 border-gray-700"
                />
                <label htmlFor="availpromo" className="text-sm text-gray-300">Set promotion as Active</label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-all">
                Save Promo
              </button>
              <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promotions Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading promotions dashboard...</div>
        ) : promotions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950/40 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-850">
                  <th className="px-6 py-4">Promo Rule</th>
                  <th className="px-6 py-4">Trigger Type</th>
                  <th className="px-6 py-4">Discount Applied</th>
                  <th className="px-6 py-4 text-center">Active Period</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850 text-xs text-gray-300">
                {promotions.map(p => {
                  let triggerText = '';
                  if (p.type === 'coupon') triggerText = `Manual Code: ${p.coupon_code}`;
                  else if (p.type === 'automated_product') triggerText = `Bulk Line Item (Qty >= ${p.min_quantity})`;
                  else if (p.type === 'automated_order') triggerText = `Cart Total >= ₹${p.min_order_amount}`;

                  return (
                    <tr key={p.id} className="hover:bg-gray-800/20">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{p.name}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-medium">{triggerText}</td>
                      <td className="px-6 py-4 text-amber-400 font-extrabold">
                        {p.discount_type === 'percentage' ? `${p.value}%` : `₹${p.value}`}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        {p.start_date || p.end_date ? (
                          <>
                            {p.start_date ? p.start_date.split('T')[0] : 'Open'}
                            <span className="mx-1">→</span>
                            {p.end_date ? p.end_date.split('T')[0] : 'Open'}
                          </>
                        ) : 'Always'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${p.is_active === 1 || p.is_active === true ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {p.is_active === 1 || p.is_active === true ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleEdit(p)} className="text-amber-500 hover:text-amber-400 font-bold transition-colors">Edit</button>
                          <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-400 font-bold transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 text-sm">No promotions configured.</div>
        )}
      </div>
    </div>
  );
}

// ── TABLES & FLOORS PANEL ──────────────────────────────────────────────────────
function BookingsPanel() {
  const [tables, setTables] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [floorFormOpen, setFloorFormOpen] = useState(false);

  // Table form fields
  const [editId, setEditId] = useState(null);
  const [floorId, setFloorId] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [seats, setSeats] = useState('2');
  const [status, setStatus] = useState('available');
  const [error, setError] = useState('');

  // Floor form field
  const [floorName, setFloorName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([tablesAPI.list(), tablesAPI.floors()]);
      setTables(t || []);
      setFloors(f || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveTable = async (e) => {
    e.preventDefault();
    if (!floorId || !tableNumber) { setError('Floor and Table Number are required.'); return; }
    setError('');
    const data = {
      floor_id: Number(floorId),
      table_number: tableNumber,
      seats: Number(seats),
      status
    };

    try {
      if (editId) {
        await api.put(`/api/tables/${editId}`, data);
      } else {
        await api.post('/api/tables', data);
      }
      loadData();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save table.');
    }
  };

  const handleCreateFloor = async (e) => {
    e.preventDefault();
    if (!floorName) return;
    try {
      await api.post('/api/floors', { name: floorName });
      setFloorName('');
      setFloorFormOpen(false);
      loadData();
    } catch (err) {
      alert('Failed to create floor: ' + err.message);
    }
  };

  const handleDeleteFloor = async (id) => {
    if (!window.confirm('Delete this floor and all its tables?')) return;
    try {
      await api.delete(`/api/floors/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to delete floor: ' + err.message);
    }
  };

  const handleEditTable = (t) => {
    setEditId(t.id);
    setFloorId(t.floor_id || '');
    setTableNumber(t.table_number);
    setSeats(t.seats);
    setStatus(t.status);
    setFormOpen(true);
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm('Delete this table?')) return;
    try {
      await api.delete(`/api/tables/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to delete table: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFloorId('');
    setTableNumber('');
    setSeats('2');
    setStatus('available');
    setFormOpen(false);
    setError('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Overview header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Cafe Layout & Table Bookings</h1>
          <p className="text-gray-400 text-xs mt-0.5">Configure floors, add tables, download table QR tokens, or manage table occupancy</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFloorFormOpen(true)}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 rounded-xl transition-all text-xs font-bold"
          >
            + Add Floor
          </button>
          <button
            onClick={() => { resetForm(); setFormOpen(true); }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-all text-xs"
          >
            + Add Table
          </button>
        </div>
      </div>

      {/* Floor Form overlay */}
      {floorFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateFloor} className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-white font-bold text-base">Add New Floor</h3>
            <input
              type="text"
              placeholder="e.g. Ground Floor, Terrace Lounge"
              value={floorName}
              onChange={e => setFloorName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2.5 bg-amber-500 text-gray-950 font-bold rounded-xl text-xs">Save</button>
              <button type="button" onClick={() => setFloorFormOpen(false)} className="flex-1 py-2.5 bg-gray-800 text-white font-semibold rounded-xl text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table Form overlay */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveTable} className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-white font-bold text-base">{editId ? 'Edit Table Settings' : 'Create Table'}</h3>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="space-y-3">
              <select
                value={floorId}
                onChange={e => setFloorId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs"
              >
                <option value="">Select Floor Location</option>
                {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="Table Number (e.g. T1, R1)"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs font-mono"
              />
              <input
                type="number"
                placeholder="Seats quantity"
                value={seats}
                onChange={e => setSeats(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs"
              />
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs"
              >
                <option value="available">Available (Free)</option>
                <option value="occupied">Occupied (In Use)</option>
                <option value="reserved">Reserved (Booked)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2.5 bg-amber-500 text-gray-950 font-bold rounded-xl text-xs">Save</button>
              <button type="button" onClick={resetForm} className="flex-1 py-2.5 bg-gray-800 text-white font-semibold rounded-xl text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Floors & Tables grid */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading floor layout plans...</div>
        ) : floors.length > 0 ? (
          floors.map(f => {
            const floorTables = tables.filter(t => t.floor_id === f.id);
            return (
              <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-850 pb-4">
                  <div>
                    <h3 className="text-white font-black text-lg tracking-tight">{f.name}</h3>
                    <p className="text-gray-500 text-xs font-semibold">{floorTables.length} tables configured</p>
                  </div>
                  <button
                    onClick={() => handleDeleteFloor(f.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-bold px-3 py-1 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-lg transition-all"
                  >
                    Delete Floor
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {floorTables.map(t => (
                    <div
                      key={t.id}
                      className={`p-4 border rounded-2xl flex flex-col justify-between h-36 ${
                        t.status === 'occupied'
                          ? 'border-amber-500 bg-amber-500/5'
                          : t.status === 'reserved'
                          ? 'border-indigo-500 bg-indigo-500/5'
                          : 'border-gray-800 bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-white font-black text-base font-mono">{t.table_number}</span>
                        <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                          t.status === 'occupied'
                            ? 'bg-amber-500/10 text-amber-400'
                            : t.status === 'reserved'
                            ? 'bg-indigo-500/10 text-indigo-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {t.status === 'occupied' ? 'Occupied' : t.status === 'reserved' ? 'Reserved' : 'Free'}
                        </span>
                      </div>

                      <div className="text-gray-400 text-xs mt-2 font-medium">
                        👥 {t.seats} seats
                      </div>

                      <div className="flex gap-2 mt-4 pt-2 border-t border-gray-850/50">
                        <button
                          onClick={() => handleEditTable(t)}
                          className="flex-1 py-1 text-center bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg text-[10px] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTable(t.id)}
                          className="text-red-500 hover:text-red-400 p-1 rounded-lg text-[10px]"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-500">No floors or tables configured.</div>
        )}
      </div>
    </div>
  );
}

// ── USERS & EMPLOYEES PANEL ────────────────────────────────────────────────────
function EmployeesPanel() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Form fields
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [isArchived, setIsArchived] = useState(false);
  const [error, setError] = useState('');

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeesAPI.list();
      setEmployees(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !email || (!editId && !password)) {
      setError('Name, email, and password are required.');
      return;
    }
    setError('');

    const data = {
      name,
      email,
      role,
      is_archived: isArchived,
      password: password || undefined
    };

    try {
      if (editId) {
        await employeesAPI.update(editId, data);
      } else {
        await employeesAPI.create(data);
      }
      loadEmployees();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save employee.');
    }
  };

  const handleEdit = (emp) => {
    setEditId(emp.id);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setIsArchived(emp.is_archived === 1 || emp.is_archived === true);
    setPassword('');
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await employeesAPI.delete(id);
      loadEmployees();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setIsArchived(false);
    setFormOpen(false);
    setError('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Users / Employees Setup</h1>
          <p className="text-gray-400 text-xs mt-0.5">Add employees, update credentials, change roles, or block/archive staff</p>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-sm"
        >
          + Add Staff Account
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-md p-8 space-y-4 animate-in zoom-in-95 duration-200">
            <h2 className="text-white font-bold text-lg">{editId ? 'Edit Account' : 'Create Staff Account'}</h2>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              <input
                type="password"
                placeholder={editId ? "Leave blank to keep password" : "Enter temporary password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />

              <div className="grid grid-cols-1 gap-3">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none"
                >
                  <option value="employee">POS Cashier / Employee</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              {editId && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="blockacc"
                    checked={isArchived}
                    onChange={e => setIsArchived(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-gray-850 border-gray-700"
                  />
                  <label htmlFor="blockacc" className="text-sm text-gray-300">Archive/Block this staff account</label>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-all">
                Save Account
              </button>
              <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading staff records...</div>
        ) : employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950/40 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-850">
                  <th className="px-6 py-4">Employee Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Access Role</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850 text-xs text-gray-300">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-800/20">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-[10px]">
                        {emp.name.charAt(0)}
                      </div>
                      {emp.name}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{emp.email}</td>
                    <td className="px-6 py-4 font-bold uppercase text-[10px] text-gray-500 tracking-wider">
                      {emp.role === 'admin' ? '⚙️ Admin' : '🖥️ POS Cashier'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${emp.is_archived === 0 || emp.is_archived === false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {emp.is_archived === 0 || emp.is_archived === false ? 'Active' : 'Blocked / Archived'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => handleEdit(emp)} className="text-amber-500 hover:text-amber-400 font-bold transition-colors">Configure</button>
                        <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:text-red-400 font-bold transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 text-sm">No employee records configured.</div>
        )}
      </div>
    </div>
  );
}

// ── REPORTS PANEL ─────────────────────────────────────────────────────────────
function ReportsPanel() {
  const [metrics, setMetrics] = useState(null);
  const [period, setPeriod] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [productId, setProductId] = useState('');
  
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // kept for future error display

  const loadFilterData = useCallback(async () => {
    try {
      const [u, s, p] = await Promise.all([
        employeesAPI.list(),
        sessionsAPI.list(),
        productsAPI.list()
      ]);
      setUsers(u || []);
      setSessions(s || []);
      setProducts(p || []);
    } catch (err) {
      console.error('Failed to load filter data:', err);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reportsAPI.dashboard({ 
        period, 
        user_id: userId, 
        session_id: sessionId, 
        product_id: productId 
      });
      setMetrics(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch reporting data.');
    } finally {
      setLoading(false);
    }
  }, [period, userId, sessionId, productId]);

  useEffect(() => { loadFilterData(); }, [loadFilterData]);
  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const KPICard = ({ title, value, trend, label, colorClass }) => {
    const isPositive = parseFloat(trend) >= 0;
    return (
      <div className="bg-gray-900/40 rounded-3xl p-6 shadow-xl border border-gray-800/50 backdrop-blur-sm flex flex-col justify-between">
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <h2 className="text-3xl font-black text-white">{value}</h2>
        </div>
        <div className={`mt-4 flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend)}%
          <span className="text-gray-500 font-normal ml-1">Since last period</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 -m-8 text-white">
      {/* Header Section */}
      <div className="bg-gray-950/50 backdrop-blur-md border-b border-gray-800/50 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-black text-amber-500 flex items-center gap-2">
            <span className="bg-amber-500/10 p-2 rounded-xl text-amber-500 border border-amber-500/20">☕</span>
            <span className="text-white">Reports</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <Calculator size={20} className="hover:text-amber-500 transition-colors cursor-pointer" />
            <FileEdit size={20} className="hover:text-amber-500 transition-colors cursor-pointer" />
            <ExternalLink size={20} className="hover:text-amber-500 transition-colors cursor-pointer" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
            <UserIcon size={20} />
          </div>
          <div className="w-10 h-10 border border-gray-800 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-gray-900 hover:text-white transition-all cursor-pointer">
            <Menu size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-6 py-4 rounded-[1.5rem]">
            {error}
          </div>
        )}
        {/* Filters and Export */}
        <div className="flex flex-wrap items-center justify-between gap-6 pb-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                className="appearance-none bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold py-2.5 px-5 pr-10 rounded-full focus:ring-2 focus:ring-blue-500/20 cursor-pointer outline-none hover:bg-blue-500/15 transition-all"
              >
                <option value="" className="bg-gray-900">All</option>
                <option value="today" className="bg-gray-900">Today</option>
                <option value="this_week" className="bg-gray-900">This Week</option>
                <option value="this_month" className="bg-gray-900">This Month</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400 text-[10px]">▼</div>
            </div>

            <div className="relative">
              <select 
                value={userId} 
                onChange={(e) => setUserId(e.target.value)}
                className="appearance-none bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold py-2.5 px-5 pr-10 rounded-full focus:ring-2 focus:ring-pink-500/20 cursor-pointer outline-none hover:bg-pink-500/15 transition-all"
              >
                <option value="" className="bg-gray-900">User</option>
                {users.map(u => <option key={u.id} value={u.id} className="bg-gray-900">{u.name}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-pink-400 text-[10px]">▼</div>
            </div>

            <div className="relative">
              <select 
                value={sessionId} 
                onChange={(e) => setSessionId(e.target.value)}
                className="appearance-none bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold py-2.5 px-5 pr-10 rounded-full focus:ring-2 focus:ring-purple-500/20 cursor-pointer outline-none hover:bg-purple-500/15 transition-all"
              >
                <option value="" className="bg-gray-900">Session</option>
                {sessions.map(s => <option key={s.id} value={s.id} className="bg-gray-900">#{s.id} - {new Date(s.start_time).toLocaleDateString()}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400 text-[10px]">▼</div>
            </div>

            <div className="relative">
              <select 
                value={productId} 
                onChange={(e) => setProductId(e.target.value)}
                className="appearance-none bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold py-2.5 px-5 pr-10 rounded-full focus:ring-2 focus:ring-indigo-500/20 cursor-pointer outline-none hover:bg-indigo-500/15 transition-all"
              >
                <option value="" className="bg-gray-900">Product</option>
                {products.map(p => <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 text-[10px]">▼</div>
            </div>
            
            <button className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-gray-900 rounded-xl">
              <Calendar size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex flex-col items-center bg-gray-900 border border-gray-800 p-2.5 rounded-2xl text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-800 hover:border-gray-700 transition-all w-14 group">
              <Download size={14} className="mb-1 group-hover:scale-110 transition-transform" />
              PDF
            </button>
            <button className="flex flex-col items-center bg-gray-900 border border-gray-800 p-2.5 rounded-2xl text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-800 hover:border-gray-700 transition-all w-14 group">
              <Download size={14} className="mb-1 group-hover:scale-110 transition-transform" />
              XLS
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500 font-medium animate-pulse">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            Generating analytics metrics...
          </div>
        ) : metrics ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12 pb-12">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard 
                title="Total Order" 
                value={metrics.summary.total_orders} 
                trend={metrics.summary.total_orders_trend} 
              />
              <KPICard 
                title="Revenue" 
                value={`₹${Number(metrics.summary.total_revenue).toFixed(0)}`} 
                trend={metrics.summary.total_revenue_trend} 
              />
              <KPICard 
                title="Average Order" 
                value={`₹${Number(metrics.summary.average_order_value).toFixed(0)}`} 
                trend={metrics.summary.average_order_value_trend} 
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white border-b-4 border-blue-500/40 pb-2">Sales Forecast</h3>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-black uppercase tracking-tighter">Live</span>
                </div>
                <div className="bg-gray-900/40 rounded-[2rem] p-6 border border-gray-800/80 shadow-2xl backdrop-blur-sm">
                  <SalesAreaChart data={metrics.charts.sales_trend} />
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white border-b-4 border-amber-500/40 pb-2">Category Distribution</h3>
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 font-black uppercase tracking-tighter">Volume</span>
                </div>
                <div className="bg-gray-900/40 rounded-[2rem] p-6 border border-gray-800/80 shadow-2xl backdrop-blur-sm">
                  <CategoryPieChart data={metrics.charts.top_categories} />
                </div>
              </div>
            </div>

            {/* Detailed Tables */}
            <div className="space-y-10">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white border-b-4 border-emerald-500/40 w-fit pb-2">Recent Transactions</h3>
                <div className="bg-gray-950 border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-900/50">
                        <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800/50">
                          <th className="px-8 py-5">Order</th>
                          <th className="px-8 py-5">Sessions</th>
                          <th className="px-8 py-5">Point of Sale</th>
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Customer</th>
                          <th className="px-8 py-5">Employee</th>
                          <th className="px-8 py-5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/30 text-xs">
                        {metrics.charts.top_orders.map(o => (
                          <tr key={o.id} className="hover:bg-gray-900/40 transition-all duration-300 group">
                            <td className="px-8 py-5 font-black text-blue-400 group-hover:pl-10 transition-all">{o.order_number || `#${o.id}`}</td>
                            <td className="px-8 py-5 text-gray-400 font-medium flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500/40"></span>
                              POS/{String(o.session_id).padStart(5, '0')}
                            </td>
                            <td className="px-8 py-5 text-gray-400">Main Shop</td>
                            <td className="px-8 py-5 text-gray-500">{new Date(o.date).toLocaleDateString()}</td>
                            <td className="px-8 py-5 text-gray-300 font-bold">{o.customer_name || 'Walk-in'}</td>
                            <td className="px-8 py-5">
                              <span className="bg-gray-900 px-3 py-1 rounded-lg border border-gray-800 text-gray-400">{o.employee_name}</span>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-white text-base">₹{Number(o.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white border-b-4 border-blue-500/40 w-fit pb-2">Top Performance Products</h3>
                  <div className="bg-gray-950 border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-900/50">
                        <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800/50">
                          <th className="px-8 py-5">Product</th>
                          <th className="px-8 py-5">Qty Sold</th>
                          <th className="px-8 py-5 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/30 text-xs font-semibold">
                        {metrics.charts.top_products.slice(0, 5).map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-900/40 transition-all">
                            <td className="px-8 py-5 text-gray-100 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-[10px] font-black">{idx + 1}</div>
                              {p.product_name}
                            </td>
                            <td className="px-8 py-5 text-gray-400 bg-gray-900/20">{p.total_quantity} units</td>
                            <td className="px-8 py-5 text-right font-black text-amber-500 text-sm">₹{Number(p.revenue).toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white border-b-4 border-amber-500/40 w-fit pb-2">Category Performance</h3>
                  <div className="bg-gray-950 border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-900/50">
                        <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800/50">
                          <th className="px-8 py-5">Category</th>
                          <th className="px-8 py-5 text-right">Revenue Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/30 text-xs font-semibold">
                        {metrics.charts.top_categories.slice(0, 5).map((c, idx) => (
                          <tr key={idx} className="hover:bg-gray-900/40 transition-all">
                            <td className="px-8 py-5 text-gray-100 uppercase tracking-widest text-[10px]">{c.category_name}</td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-black text-white text-sm">₹{Number(c.revenue).toFixed(0)}</span>
                                <span className="text-[9px] text-gray-500 mt-0.5">{(parseFloat(c.revenue) / parseFloat(metrics.summary.total_revenue) * 100).toFixed(1)}% share</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-24 text-gray-500 flex flex-col items-center">
            <span className="text-6xl mb-6">📉</span>
            <p className="text-xl font-bold text-gray-300">Data Synchronization Problem</p>
            <p className="text-sm mt-2 text-gray-500 max-w-xs">We couldn't retrieve the latest dashboard metrics from the cloud. Please verify your connection.</p>
            <button onClick={loadMetrics} className="mt-8 px-6 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-all">Retry Sync</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MOBILE ORDER PANEL ───────────────────────────────────────────────────────
function MobileOrderPanel() {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('odoo_mobile_self_ordering_enabled') === 'true';
  });
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('odoo_mobile_ordering_mode') || 'online';
  });
  const [bgColor, setBgColor] = useState(() => {
    return localStorage.getItem('odoo_mobile_background_color') || '#0f172a';
  });
  const [uploadedImages, setUploadedImages] = useState(() => {
    try {
      const saved = localStorage.getItem('odoo_mobile_background_images');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [loadingTables, setLoadingTables] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch tables from database
  useEffect(() => {
    const fetchTables = async () => {
      setLoadingTables(true);
      try {
        const res = await tablesAPI.list();
        setTables(res || []);
        if (res && res.length > 0) {
          setSelectedTableId(res[0].id);
        }
      } catch (err) {
        console.warn('Failed to load tables:', err);
      } finally {
        setLoadingTables(false);
      }
    };
    fetchTables();
  }, []);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    // Limit to 3 images max
    if (uploadedImages.length + files.length > 3) {
      alert('You can upload a maximum of 3 background slider images.');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages(prev => {
          const newImages = [...prev, { name: file.name, dataUrl: reader.result }];
          return newImages.slice(0, 3);
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    setUploadedImages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    localStorage.setItem('odoo_mobile_self_ordering_enabled', String(enabled));
    localStorage.setItem('odoo_mobile_ordering_mode', mode);
    localStorage.setItem('odoo_mobile_background_color', bgColor);
    localStorage.setItem('odoo_mobile_background_images', JSON.stringify(uploadedImages));
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Generate dynamic preview URL token
  const selectedTable = tables.find(t => String(t.id) === String(selectedTableId));
  const tableToken = selectedTable?.qr_token || 'asdfghhjkl';
  const generatedUrl = `https://abcd.com/s/${tableToken}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mobile Order Panel</h1>
          <p className="text-gray-400 text-xs mt-0.5">Configure Self-Ordering QR menu parameters and custom brand layout settings</p>
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-black rounded-2xl shadow-lg transition-transform active:scale-95 text-xs flex items-center gap-2"
        >
          💾 Save Configurations
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-2xl px-4 py-3 animate-in fade-in duration-200">
          ✨ Settings saved successfully! Mobile order configuration has been updated.
        </div>
      )}

      {/* Master Toggle */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-lg flex items-center justify-between">
        <div className="space-y-1 pr-4">
          <h3 className="text-white font-extrabold text-base">Self Ordering System</h3>
          <p className="text-gray-500 text-xs leading-relaxed">Enable customers to scan table QR codes to browse the menu and place orders directly from their phones.</p>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="self-ordering-toggle"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-gray-950 border-gray-700 cursor-pointer"
          />
        </div>
      </div>

      {/* Conditional Settings Configurations */}
      {enabled ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Left Column: Mode Switcher & URLs */}
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-lg space-y-5">
              <h3 className="text-white font-extrabold text-sm border-b border-gray-850 pb-3">Mode Settings</h3>
              
              {/* Dropdown Selector */}
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold">Self-Ordering Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-4 py-3.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="online">Online ordering</option>
                  <option value="qr">QR Menu</option>
                </select>
              </div>

              {/* Mode Specific Logic */}
              {mode === 'online' ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-slate-400 text-xs leading-relaxed font-medium">
                    Online ordering mode allows customers to select items, configure modifiers, and submit orders directly to the Kitchen KDS system.
                  </p>
                  
                  {/* Payment Method Mandatory read-only checkbox */}
                  <div className="bg-gray-950/50 border border-gray-850 rounded-2xl p-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="payment-method-counter"
                      checked={true}
                      disabled={true}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-gray-800 border-gray-700 cursor-not-allowed"
                    />
                    <div>
                      <label htmlFor="payment-method-counter" className="text-xs font-bold text-gray-300">Payment Method: Pay at counter</label>
                      <p className="text-[10px] text-gray-500 mt-0.5">Mandatory checkout option for counter cashiers.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* QR Menu Warning box */}
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-2xl px-4 py-3 leading-relaxed">
                    ⚠️ <strong>Digital Menu Mode:</strong> It's only digital menu, not able to order. Customers can only view products and pricing details.
                  </div>
                </div>
              )}

              {/* URL & QR Action Links */}
              <div className="pt-4 border-t border-gray-850 flex gap-3 text-xs">
                <a
                  href="/pos"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-2.5 bg-gray-850 hover:bg-gray-800 text-amber-400 hover:text-amber-300 font-bold border border-gray-800 rounded-xl transition-colors"
                >
                  🔗 Preview Webpage
                </a>
                <button
                  type="button"
                  onClick={() => alert('Downloading high-resolution table QR codes bundle...')}
                  className="flex-1 text-center py-2.5 bg-gray-850 hover:bg-gray-800 text-white font-bold border border-gray-800 rounded-xl transition-colors"
                >
                  📥 Download QR code
                </button>
              </div>
            </div>

            {/* URL Generator Display */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-lg space-y-4">
              <h3 className="text-white font-extrabold text-sm border-b border-gray-850 pb-3">Dynamic URL Token Generator</h3>
              
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Select a physical table layout to generate the specific, secure QR code ordering URL route token:
              </p>

              {/* Table Selection Dropdown */}
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold">Generate For Table</label>
                {loadingTables ? (
                  <p className="text-gray-500 text-xs">Loading available tables...</p>
                ) : tables.length > 0 ? (
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl px-4 py-3.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.floor_name} - Table {t.table_number}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    disabled={true}
                    className="w-full bg-gray-950 border border-gray-800 text-slate-500 rounded-xl px-4 py-3.5 text-xs"
                  >
                    <option>No active tables found (Mock fallback table)</option>
                  </select>
                )}
              </div>

              {/* Dynamic URL Link Display */}
              <div className="bg-gray-950 border border-gray-850 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="overflow-hidden">
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Generated Self-Ordering Link</p>
                  <p className="text-amber-500 text-xs font-bold font-mono tracking-tight mt-1 overflow-x-auto whitespace-nowrap scrollbar-thin">
                    {generatedUrl}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedUrl);
                    alert('Token link copied to clipboard!');
                  }}
                  className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold rounded-lg border border-gray-750 transition-colors self-end sm:self-center flex-shrink-0"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls */}
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-lg space-y-5">
              <h3 className="text-white font-extrabold text-sm border-b border-gray-850 pb-3">Visual Brand Customization</h3>
              
              {/* Color Picker */}
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold">Self-Ordering Webpage Background Color</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-14 h-12 bg-gray-950 border border-gray-800 p-2 rounded-xl cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    placeholder="#0f172a"
                    className="flex-1 bg-gray-950 border border-gray-800 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 transition-colors font-mono uppercase"
                  />
                </div>
              </div>

              {/* Slider Image Upload Module */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-400 text-xs font-semibold">Background Slider Images (Max 3)</label>
                  <span className="text-[10px] text-gray-500 font-bold">{uploadedImages.length}/3 Uploaded</span>
                </div>

                <div className="relative border-2 border-dashed border-gray-800 hover:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-gray-950/40">
                  <input
                    type="file"
                    multiple={true}
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadedImages.length >= 3}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className="text-2xl mb-1.5">🖼️</span>
                  <span className="text-xs font-bold text-white">Click or drag images to upload</span>
                  <span className="text-[10px] text-gray-500 mt-1">Image 1, Image 2, Image 3 sliders</span>
                </div>

                {/* Previews List */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 pt-3 animate-in fade-in duration-200">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-800 h-20 bg-gray-950">
                        <img
                          src={img.dataUrl}
                          alt={`Slider ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay overlay info */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="text-red-400 hover:text-red-300 font-extrabold text-[10px] bg-red-950/80 px-2 py-1 rounded-md border border-red-900/50"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 bg-slate-950/85 px-1.5 py-0.5 text-[8px] font-bold text-gray-400 rounded-tr-md">
                          Slider {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-12 text-center text-gray-500 animate-in fade-in duration-200">
          <span className="text-4xl">📴</span>
          <h3 className="text-white font-extrabold text-base mt-4">Self Ordering is Disabled</h3>
          <p className="text-xs max-w-sm mx-auto mt-2 leading-relaxed font-medium text-gray-500">
            Check the master slider above to activate the Self-Ordering QR infrastructure and configure web styling configurations, menu options, and URL routes.
          </p>
        </div>
      )}
    </div>
  );
}

// ── TABLE QR CODES PANEL ─────────────────────────────────────────────────────
// Renders live QR codes for every active dining table via the `qrcode` npm lib.
// Each card: Table label, floor, token URL, canvas QR, Download PNG button.
// "Download QR PDF" button tiles all cards onto an A4 PDF via jsPDF + html2canvas.
// ─────────────────────────────────────────────────────────────────────────────
function TableQRCodesPanel() {
  const [tables,  setTables]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [filter,  setFilter]  = useState('');   // floor filter
  const [floors,  setFloors]  = useState([]);

  // ── Load tables + floors ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tbl, flr] = await Promise.all([tablesAPI.list(), tablesAPI.floors()]);
        setTables(Array.isArray(tbl) ? tbl : []);
        setFloors(Array.isArray(flr) ? flr : []);
      } catch (err) {
        console.error('[QR Panel] Failed to load tables:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Derive QR URL from table token ──────────────────────────────────────────
  const qrUrl = (table) =>
    `https://abcd.com/s/${table.qr_token || `table-${table.id}`}`;

  // ── Render QR onto a <canvas> ref ───────────────────────────────────────────
  const QRCanvas = ({ table }) => {
    const canvasRef = React.useRef(null);

    React.useEffect(() => {
      if (!canvasRef.current) return;
      import('qrcode').then(QRCode => {
        QRCode.toCanvas(canvasRef.current, qrUrl(table), {
          width: 200,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        }).catch(err => console.warn('[QR Canvas]', err));
      });
    }, [table]);

    return (
      <canvas
        ref={canvasRef}
        id={`qr-canvas-${table.id}`}
        className="rounded-xl shadow-lg"
        style={{ width: 160, height: 160 }}
      />
    );
  };

  // ── Download single QR as PNG ────────────────────────────────────────────────
  const downloadPNG = (table) => {
    const canvas = document.getElementById(`qr-canvas-${table.id}`);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `table-${table.table_number}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ── Download ALL as PDF ───────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { default: jsPDF } = await import('jspdf');


      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();   // 210 mm
      const pageH = doc.internal.pageSize.getHeight();  // 297 mm

      // Grid: 3 columns, auto rows
      const colCount = 3;
      const cellW    = (pageW - 20) / colCount;  // 10 mm margin each side
      const cellH    = 80;                         // mm per card
      const marginX  = 10;
      const marginY  = 14;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Odoo Café — Table QR Codes', pageW / 2, 10, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated ${new Date().toLocaleDateString()}  •  Scan to order`, pageW / 2, 14, { align: 'center' });

      const filtered = tables.filter(t => !filter || String(t.floor_id) === filter);

      for (let i = 0; i < filtered.length; i++) {
        const table  = filtered[i];
        const col    = i % colCount;
        const row    = Math.floor(i / colCount);
        const x      = marginX + col * cellW;
        const y      = marginY + row * cellH;

        // New page when needed
        if (row > 0 && col === 0 && i !== 0) {
          if (y + cellH > pageH - 10) {
            doc.addPage();
            // Reset y reference — jsPDF tracks pages internally
          }
        }

        // Card background
        doc.setFillColor(241, 245, 249);   // slate-100
        doc.roundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 4, 4, 'F');

        // Card border
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 4, 4, 'S');

        // Floor badge
        doc.setFillColor(245, 158, 11);   // amber-500
        doc.roundedRect(x + 4, y + 4, cellW - 8, 5, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(15, 23, 42);
        doc.text(table.floor_name || 'Ground Floor', x + cellW / 2, y + 7.5, { align: 'center' });

        // Table name
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Table ${table.table_number}`, x + cellW / 2, y + 18, { align: 'center' });

        // QR canvas → image
        const canvas = document.getElementById(`qr-canvas-${table.id}`);
        if (canvas) {
          const imgData  = canvas.toDataURL('image/png');
          const qrSize   = cellW - 20;
          const qrX      = x + (cellW - qrSize) / 2;
          doc.addImage(imgData, 'PNG', qrX, y + 22, qrSize, qrSize);
        }

        // Token text
        doc.setFont('courier', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        const token = table.qr_token || `table-${table.id}`;
        doc.text(token, x + cellW / 2, y + cellH - 6, { align: 'center' });
      }

      doc.save('odoo-cafe-table-qrcodes.pdf');
    } catch (err) {
      console.error('[QR PDF] Export failed:', err);
      alert('PDF export failed: ' + err.message);
    } finally {
      setPdfBusy(false);
    }
  };

  const filtered = tables.filter(t => !filter || String(t.floor_id) === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Table QR Codes</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            Auto-generated QR codes for every active dining table. Each code encodes a unique self-ordering URL.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Floor filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-white text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">All Floors</option>
            {floors.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* PDF export */}
          <button
            onClick={downloadPDF}
            disabled={pdfBusy || loading || filtered.length === 0}
            className={[
              'flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all',
              pdfBusy || loading || filtered.length === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 shadow-lg shadow-amber-500/20 active:scale-95',
            ].join(' ')}
          >
            {pdfBusy ? (
              <>
                <span className="w-4 h-4 border-2 border-gray-900/40 border-t-gray-900 rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>📥 Download QR PDF →</>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: 'Total Tables', value: tables.length, color: 'text-amber-400' },
          { label: 'Floors',       value: floors.length, color: 'text-violet-400' },
          { label: 'Visible',      value: filtered.length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
            <span className="text-gray-500 text-xs font-bold">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── QR Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-3xl p-5 flex flex-col items-center gap-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-800 rounded-full" />
              <div className="w-40 h-40 bg-gray-800 rounded-2xl" />
              <div className="h-3 w-32 bg-gray-800 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-16 text-center">
          <span className="text-4xl">📋</span>
          <h3 className="text-white font-extrabold text-base mt-4">No Tables Found</h3>
          <p className="text-gray-500 text-xs mt-2 max-w-xs mx-auto">
            Create dining tables in the <strong>Tables &amp; Floors</strong> panel first. Each table automatically gets a unique QR token.
          </p>
        </div>
      ) : (
        <div
          id="qr-grid-container"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
        >
          {filtered.map(table => (
            <div
              key={table.id}
              className="group bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-3xl p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-0.5"
            >
              {/* Floor badge */}
              <div className="flex items-center gap-1.5 self-start w-full">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full truncate max-w-full">
                  {table.floor_name || 'Floor'}
                </span>
              </div>

              {/* Table title */}
              <p className="text-white font-black text-base tracking-tight">
                Table {table.table_number}
              </p>

              {/* ── Live QR canvas ── */}
              <div className="w-40 h-40 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg border border-gray-200 group-hover:shadow-amber-500/20 group-hover:border-amber-500/30 transition-all">
                <QRCanvas table={table} />
              </div>

              {/* Token URL snippet */}
              <p
                className="text-gray-600 text-[9px] font-mono text-center truncate w-full px-2"
                title={qrUrl(table)}
              >
                {qrUrl(table)}
              </p>

              {/* Seats info */}
              <p className="text-gray-500 text-[10px] font-semibold">
                {table.seats || 2} seats · {table.status || 'available'}
              </p>

              {/* Download PNG */}
              <button
                onClick={() => downloadPNG(table)}
                className="w-full py-2.5 mt-1 bg-gray-800 hover:bg-amber-500 hover:text-gray-950 text-gray-400 hover:font-bold text-xs font-semibold rounded-xl border border-gray-700 hover:border-amber-400 transition-all duration-200"
              >
                ↓ Download PNG
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── URL format legend ── */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <span className="text-amber-500 text-lg">🔗</span>
        <div>
          <p className="text-white text-xs font-extrabold">QR URL Format</p>
          <p className="text-gray-500 text-[11px] mt-0.5 font-mono">
            https://abcd.com/s/<span className="text-amber-400">[unique_table_token]</span>
          </p>
        </div>
        <div className="sm:ml-auto text-[11px] text-gray-600 leading-relaxed">
          Token is generated when the table is created in <em>Tables &amp; Floors</em>.<br />
          Print the PDF and place cards on each table for customer self-ordering.
        </div>
      </div>
    </div>
  );
}

