import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Sale } from '../types';
import { seedCompleteSystem } from '../utils/seeds';
import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  MapPin, 
  AlertCircle,
  CalendarDays,
  Database,
  Sparkles,
  RefreshCw,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { profile, branches, settings } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [seedError, setSeedError] = useState('');

  const handleSeedSystem = async () => {
    setSeeding(true);
    setSeedError('');
    setSeedSuccess(false);
    try {
      await seedCompleteSystem();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 5500);
    } catch (err: any) {
      console.error(err);
      setSeedError(err?.message || String(err));
    } finally {
      setSeeding(false);
    }
  };

  // Determine which branch to lock to based on role
  const branchFilter = profile?.role === 'admin' ? selectedBranch : profile?.branchId || '';

  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    const prodRef = collection(db, 'products');
    const salesRef = collection(db, 'sales');

    // Firestore queries
    let prodQuery = prodRef as any;
    let salesQuery = salesRef as any;

    if (profile.role !== 'admin') {
      prodQuery = query(prodRef, where('branchId', '==', profile.branchId));
      salesQuery = query(salesRef, where('branchId', '==', profile.branchId));
    } else if (selectedBranch !== 'all') {
      prodQuery = query(prodRef, where('branchId', '==', selectedBranch));
      salesQuery = query(salesRef, where('branchId', '==', selectedBranch));
    }

    // Dynamic product subscription
    const unsubscribeProducts = onSnapshot(prodQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
    }, (err) => console.error(err));

    // Dynamic sales subscription
    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      setSales(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setLoading(false);
    }, (err) => console.error(err));

    return () => {
      unsubscribeProducts();
      unsubscribeSales();
    };
  }, [profile, selectedBranch]);

  // Calculations for dashboard
  const lowStockThreshold = settings?.lowStockThreshold || 10;
  
  const lowStockItems = products.filter(p => p.stockQty <= (p.reorderLevel || lowStockThreshold) && p.status === 'active');
  
  // Expiry in 90 days calculations
  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  const expiringItems = products.filter(p => {
    if (!p.expiryDate) return false;
    const expiry = new Date(p.expiryDate);
    return expiry > now && expiry <= ninetyDaysFromNow && p.status === 'active';
  });

  const totalStockValuation = products.reduce((acc, p) => acc + (p.stockQty * p.costPrice), 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + (p.stockQty * p.unitPrice), 0);

  // Sales totals (Today and total loaded)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr) && s.status === 'completed');
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const totalRevenue = sales.reduce((acc, s) => s.status === 'completed' ? acc + s.total : acc, 0);

  // Prepare chart data: Daily trend (last 7 days)
  const getLast7DaysSales = () => {
    const daysData: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dStr = date.toISOString().split('T')[0];
      daysData[dStr] = 0;
    }

    sales.forEach(s => {
      if (s.status === 'completed') {
        const dStr = s.createdAt.split('T')[0];
        if (daysData[dStr] !== undefined) {
          daysData[dStr] += s.total;
        }
      }
    });

    return Object.entries(daysData).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      sales: Number(amount.toFixed(2)),
    }));
  };

  const chartSalesData = getLast7DaysSales();

  // Category chart data
  const getCategoryData = () => {
    const categoryTotals: { [key: string]: number } = {};
    products.forEach(p => {
      categoryTotals[p.category] = (categoryTotals[p.category] || 0) + p.stockQty;
    });

    return Object.entries(categoryTotals).map(([name, val]) => ({
      name,
      value: val,
    })).slice(0, 5); // top 5
  };

  const categoryChartData = getCategoryData();
  const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header View */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200/60 dark:border-slate-900">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display uppercase">
            Pharmacy Control Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time visual monitoring of pharmacy stock controls and sales indices.
          </p>
        </div>

        {/* Branch filter if user is Admin */}
        {profile?.role === 'admin' && (
          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition">
            <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-xs border-none bg-transparent outline-none pr-8 font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer"
            >
              <option value="all">Consolidated (All Branches)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-rose-600 dark:bg-rose-900/50 p-6 rounded-3xl flex items-center justify-between text-white shadow-lg bento-card">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Low Stock Alert Detected</h3>
              <p className="text-xs opacity-90 mt-0.5">There are {lowStockItems.length} products currently below reorder levels or expiring soon in this branch.</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate?.('inventory')}
            className="bg-white text-rose-700 px-6 py-3 rounded-2xl text-xs font-bold hover:bg-rose-50 transition shadow-sm"
          >
            Manage Inventory
          </button>
        </div>
      )}

      {/* Real-time Data Seeding Sandbox Banner (Visible to Admins) */}
      {profile?.role === 'admin' && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border border-teal-500/20 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10 text-left">
            <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-teal-500/20 text-teal-400">
              <Database className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded tracking-wide border border-teal-500/10">Active Sandbox Seeder</span>
                {products.length === 0 && (
                  <span className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/20 font-extrabold px-2 py-0.5 rounded animate-pulse">Database Empty</span>
                )}
              </div>
              <h3 className="text-md font-extrabold text-white mt-1.5 leading-snug uppercase tracking-tight font-display">
                Instantly Bootstrap complete Pharmacy Sandbox
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Click this button to seed {products.length > 0 ? 'additional' : 'initial'} branches, products catalogs with batches/expiries, a full week of completed sales history to populate analytics graphs, mock transfer orders, and chart of accounts ledgers.
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto">
            <button
              id="dashboard-seed-btn"
              onClick={handleSeedSystem}
              disabled={seeding}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black transition-all ${
                seedSuccess 
                  ? 'bg-emerald-500 text-slate-950 font-black' 
                  : 'bg-teal-500 hover:bg-teal-600 text-slate-950 shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 hover:scale-[1.01] cursor-pointer'
              } disabled:opacity-50`}
            >
              {seeding ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  PROVISIONING SANDBOX...
                </>
              ) : seedSuccess ? (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  MOCK DATA INSTALLED!
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  SEED TEST SYSTEM DATA
                </>
              )}
            </button>
            {seedError && (
              <p className="text-[10px] text-red-500 mt-1.5 font-semibold text-center">{seedError}</p>
            )}
          </div>
        </div>
      )}

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card A: Revenue Today & 7-day Area Trend */}
        <div className="col-span-1 md:col-span-2 border border-slate-200/80 dark:border-slate-950 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between bento-card select-none">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest font-display">Revenue Today</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                {settings?.currency || 'ZMW'} {todayStr === "2026-05-26" ? todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : todayRevenue.toFixed(2)}
              </h2>
            </div>
            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/10">
              +{todaySales.length} Transactions
            </div>
          </div>
          
          <div className="h-44 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSalesData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '11px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card B: Stock Alerts Panel */}
        <div className="col-span-1 border border-slate-200/80 dark:border-slate-950 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between bento-card">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest font-display">Stock Alerts</p>
            </div>
            
            <div className="space-y-3.5 max-h-40 overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  All stocks are above threshold levels.
                </p>
              ) : (
                lowStockItems.slice(0, 3).map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200/30">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[130px]">{item.name}</span>
                    <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-lg border border-rose-500/10">
                      {item.stockQty} Qty
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={() => onNavigate?.('inventory')}
            className="w-full py-2.5 mt-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 transition"
          >
            {lowStockItems.length > 3 ? `View All Low Items (${lowStockItems.length})` : 'Access Inventory Management'}
          </button>
        </div>

        {/* Card C: Quality Control Expiry Warnings */}
        <div className="col-span-1 bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between bento-card text-white">
          <div className="relative z-10">
            <p className="text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest font-display mb-1">Quality Control</p>
            <h3 className="text-4xl font-extrabold text-white mt-2 font-display">{expiringItems.length}</h3>
            <p className="text-slate-300 text-xs font-semibold leading-relaxed mt-1">Pharmaceuticals expiring <br/>within 90 days</p>
          </div>
          
          <div className="relative z-10 mt-6 bg-slate-850 dark:bg-slate-900 rounded-xl p-3 flex items-center justify-between border border-slate-700/40 hover:bg-slate-800 cursor-pointer transition select-none"
               onClick={() => onNavigate?.('inventory')}>
            <span className="text-[10px] text-white font-black uppercase tracking-wider">Run Expiry Inspection</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>

          {/* Abstract ambient light ball */}
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card D: Recent Sales Table */}
        <div className="col-span-1 md:col-span-3 border border-slate-200/80 dark:border-slate-950 bg-white dark:bg-slate-900 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between bento-card">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider font-display">Recent Completed Transactions</h3>
              <div className="flex gap-1.5 select-none font-sans">
                 <span className="text-[9px] font-black bg-slate-200/70 border border-slate-300/10 text-slate-700 dark:bg-slate-840 dark:text-slate-300 px-2 py-1 rounded">ALL DEPOSITS</span>
                 <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded">COMPLETED</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-2.5 text-[9px] uppercase text-slate-400 font-bold tracking-wider">Ref ID</th>
                    <th className="px-6 py-2.5 text-[9px] uppercase text-slate-400 font-bold tracking-wider">Clerk / Cashier</th>
                    <th className="px-6 py-2.5 text-[9px] uppercase text-slate-400 font-bold tracking-wider">Method</th>
                    <th className="px-6 py-2.5 text-[9px] uppercase text-slate-400 font-bold tracking-wider">Total Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-xs text-slate-400 font-medium">
                        No transactions registered yet.
                      </td>
                    </tr>
                  ) : (
                    sales.slice(0, 4).map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-850 dark:text-slate-200 text-xs font-mono">{sale.id.slice(-8).toUpperCase()}</div>
                          <div className="text-[9px] text-slate-400">{sale.createdAt.replace('T', ' ').slice(0, 16)}</div>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                          {sale.cashierName || 'System Admin'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-wide bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded border border-transparent">
                            {sale.paymentMethod || 'cash'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-extrabold text-slate-900 dark:text-white text-xs">
                          {settings?.currency || 'ZMW'} {sale.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center text-xs">
            <button 
              onClick={() => onNavigate?.('reports')}
              className="text-emerald-500 hover:text-emerald-600 font-bold hover:underline transition select-none flex items-center gap-1"
            >
              📊 Run Analytical Profit Ledger Report
            </button>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest font-semibold">{sales.length} processed</span>
          </div>
        </div>

        {/* Card E: POS Quick Actions Box */}
        <div className="col-span-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 shadow-xl shadow-emerald-500/10 flex flex-col items-center justify-center text-center text-white bento-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-5 ring-4 ring-white/10 shadow-inner">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-white font-extrabold text-lg tracking-tight leading-snug font-display">OPEN POS TERMINAL</h3>
          <p className="text-emerald-100/95 text-[11px] font-semibold mt-1.5 mb-6 px-1 leading-relaxed">
            Start a new sale instantly, handle cashier checkouts, and dispatch thermal receipts.
          </p>
          <div className="w-full space-y-2.5 relative z-10">
             <button 
               onClick={() => onNavigate?.('pos')}
               className="w-full py-3 bg-white text-emerald-600 hover:bg-emerald-50 font-black text-xs uppercase shadow-md active:scale-95 transition-all tracking-wider rounded-2xl"
             >
               Launch Register
             </button>
             <button 
               onClick={() => onNavigate?.('transfers')}
               className="w-full py-2 bg-emerald-600/50 text-white hover:bg-emerald-600 border border-emerald-400/30 font-bold text-[10px] uppercase transition-colors tracking-wide rounded-2xl"
             >
               Route Inter-Branch Stocks
             </button>
          </div>
        </div>

        {/* Card F: Category Share Chart */}
        <div className="col-span-1 md:col-span-2 border border-slate-200/80 dark:border-slate-950 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between bento-card">
          <div>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest font-display mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" />
              Category Share (by Stock Qty)
            </h2>
            <div className="h-44 flex items-center justify-center">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-xs text-slate-400">No category stock data seeded</span>
              )}
            </div>
          </div>
          {/* Legend */}
          <div className="mt-4 space-y-1.5 max-h-24 overflow-y-auto w-full border-t border-slate-100 dark:border-slate-800/80 pt-3">
            {categoryChartData.map((data, index) => (
              <div key={data.name} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate max-w-[120px] font-semibold">{data.name}</span>
                </div>
                <span className="font-extrabold text-slate-700 dark:text-slate-300">{data.value} units</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card G: Global Inventory Valuation */}
        <div className="col-span-1 md:col-span-2 border border-slate-200/80 dark:border-slate-950 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between bento-card select-none">
          <div>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest font-display mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Global Asset Valuations
            </h2>
            <p className="text-xs text-slate-500 mb-6">Branch asset balances estimated from total unit volumes in system.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Purchase Cost Asset</span>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {settings?.currency || 'ZMW'} {totalStockValuation.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </h4>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Retail Sales Asset</span>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {settings?.currency || 'ZMW'} {totalRetailValuation.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </h4>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center text-[11px] text-slate-400">
            <span className="font-semibold">Calculated on {products.length} catalog elements</span>
            <span className="text-emerald-500 font-bold uppercase tracking-wider">Live feeds</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
