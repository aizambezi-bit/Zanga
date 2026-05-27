import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Product } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Package, 
  Users, 
  FileSpreadsheet, 
  AlertTriangle,
  Building,
  Activity,
  ArrowDownToLine,
  ChevronRight,
  Calendar
} from 'lucide-react';

const COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Reports: React.FC = () => {
  const { profile, branches, settings } = useAuth();
  
  // Data state
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter Dates
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Load Sales and products
  useEffect(() => {
    if (!profile) return;
    setLoading(true);

    const sRef = collection(db, 'sales');
    const pRef = collection(db, 'products');

    const sUnsubscribe = onSnapshot(sRef, (snap) => {
      let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      if (profile.role !== 'admin') {
        items = items.filter(s => s.branchId === profile.branchId);
      }
      setSales(items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    });

    const pUnsubscribe = onSnapshot(pRef, (snap) => {
      let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      if (profile.role !== 'admin') {
        items = items.filter(p => p.branchId === profile.branchId);
      }
      setProducts(items);
      setLoading(false);
    });

    return () => {
      sUnsubscribe();
      pUnsubscribe();
    };
  }, [profile]);

  // Calculations
  const dateFilteredSales = sales.filter(s => {
    const saleDate = s.createdAt.split('T')[0];
    return saleDate >= startDate && saleDate <= endDate;
  });

  // Calculate stats
  const totalSalesRevenue = dateFilteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalTxCount = dateFilteredSales.length;
  const averageTicketSize = totalTxCount > 0 ? totalSalesRevenue / totalTxCount : 0;

  // Stock valuation: Cost Price vs Retail Asset Value
  const totalStockQty = products.reduce((sum, p) => sum + p.stockQty, 0);
  const totalCostValuation = products.reduce((sum, p) => sum + (p.stockQty * p.costPrice), 0);
  const totalRetailValuation = products.reduce((sum, p) => sum + (p.stockQty * p.unitPrice), 0);
  const potentialGrossMargin = totalRetailValuation - totalCostValuation;

  // Monthly Revenue Data (Grouped by Sale month/date)
  const getRevenueChartData = () => {
    const map: Record<string, number> = {};
    dateFilteredSales.forEach(s => {
      const dateKey = s.createdAt.split('T')[0];
      map[dateKey] = (map[dateKey] || 0) + s.grandTotal;
    });

    return Object.entries(map).map(([date, total]) => ({
      date: date.slice(-5), // MM-DD friendly label
      Revenue: total
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Top Products: Sort sales lines to find top selling drugs
  const getTopProductsData = () => {
    const map: Record<string, { name: string; qty: number; value: number }> = {};
    dateFilteredSales.forEach(s => {
      s.items.forEach(item => {
        if (!map[item.productId]) {
          map[item.productId] = { name: item.name, qty: 0, value: 0 };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].value += item.quantity * item.unitPrice;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  };

  // Expiring Products: List medications expiring within 90 days
  const getExpiringAlerts = () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() + 90);

    return products
      .filter(p => p.expiryDate && new Date(p.expiryDate) < threeMonthsAgo)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  };

  // Branch Performance: Comparing different locations
  const getBranchPerformanceData = () => {
    const map: Record<string, { name: string; Sales: number }> = {};
    
    // Seed branches
    branches.forEach(b => {
      map[b.id] = { name: b.name, Sales: 0 };
    });

    dateFilteredSales.forEach(s => {
      if (map[s.branchId]) {
        map[s.branchId].Sales += s.grandTotal;
      } else {
        map[s.branchId] = { name: `Branch ${s.branchId}`, Sales: s.grandTotal };
      }
    });

    return Object.values(map);
  };

  const revenueSeries = getRevenueChartData();
  const topProducts = getTopProductsData();
  const branchPerf = getBranchPerformanceData();
  const expiringSoon = getExpiringAlerts();

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pharmacy Analytical Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Advanced real-time reports covering revenues, branch nodes, expirations, and stock valuations.
          </p>
        </div>

        {/* Date parameters */}
        <div className="flex items-center gap-2 text-xs font-semibold bg-white border p-2.5 rounded-xl dark:bg-slate-900 dark:border-slate-800">
          <Calendar className="h-4 w-4 text-slate-450" />
          <span className="text-slate-400">Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="outline-none text-slate-705 dark:text-white dark:bg-transparent"
          />
          <ChevronRight className="h-3 w-3 text-slate-350" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="outline-none text-slate-705 dark:text-white dark:bg-transparent"
          />
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <div className="p-4 bg-white border rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Total Sales value</span>
          <h2 className="text-xl font-black text-slate-850 mt-1 dark:text-white">
            {settings?.currency || 'K'}{totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[10px] text-slate-450 mt-1 block">In range selected</span>
        </div>

        <div className="p-4 bg-white border rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Average Transaction ticket</span>
          <h2 className="text-xl font-black text-sky-600 mt-1 dark:text-sky-400">
            {settings?.currency || 'K'}{averageTicketSize.toFixed(2)}
          </h2>
          <span className="text-[10px] text-slate-450 mt-1 block">From over {totalTxCount} checkouts</span>
        </div>

        <div className="p-4 bg-white border rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Valuation Cost Stock</span>
          <h2 className="text-xl font-black text-slate-800 mt-1 dark:text-white">
            {settings?.currency || 'K'}{totalCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[10px] text-slate-450 mt-1 block">Value of stock on shelves</span>
        </div>

        <div className="p-4 bg-white border rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Retail Asset value</span>
          <h2 className="text-xl font-black text-emerald-600 mt-1">
            {settings?.currency || 'K'}{totalRetailValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[10px] text-emerald-500 font-bold mt-1 block">Gross profit potential: +{settings?.currency || 'K'}{potentialGrossMargin.toFixed(0)}</span>
        </div>
      </div>

      {/* REVENUE OVER TIME GRID CHARTS */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Main Area trend */}
        <div className="lg:col-span-8 bg-white border p-5 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-md dark:text-white">Operating Daily Revenue Chart</h3>
              <p className="text-[11px] text-slate-400">Visualizes sales trends during the selected range</p>
            </div>
            <TrendingUp className="h-5 w-5 text-indigo-405" />
          </div>

          <div className="h-72 mt-4 text-xs font-mono">
            {revenueSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 italic">No checkout telemetry recorded in selected date range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Area type="monotone" dataKey="Revenue" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top selling list */}
        <div className="lg:col-span-4 bg-white border p-5 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 text-sm md:text-md border-b pb-3 dark:text-white dark:border-slate-800">
            Top-5 Selling Products
          </h3>
          <div className="divide-y mt-2 dark:divide-slate-820">
            {topProducts.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 italic">No transactions cataloged yet.</div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-3.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block max-w-[140px] truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Sum retail: {settings?.currency || 'K'}{p.value.toFixed(2)}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-sky-50 text-sky-850 font-black rounded-lg text-xs dark:bg-sky-950/40 dark:text-sky-305">
                    {p.qty} units
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* LOWER GRIDS COMPARISON */}
      <div className="grid gap-6 sm:grid-cols-2">
        
        {/* Branch metrics Bar charts */}
        <div className="bg-white border p-5 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 text-sm md:text-md border-b pb-4 dark:text-white dark:border-slate-805">
            Store Branch comparative performance
          </h3>
          <div className="h-64 mt-4 font-mono text-[10px]">
            {profile?.role !== 'admin' ? (
              <div className="h-full flex items-center justify-center text-slate-400 italic text-center text-xs p-8">
                Locked: Branch performance is aggregated solely at Global Administrator level.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchPerf}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="Sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expiring batch notifications list */}
        <div className="bg-white border p-5 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
            <h3 className="font-bold text-slate-900 text-sm md:text-md dark:text-white">Batch Expirations Alert Board</h3>
            <span className="p-1 rounded bg-rose-50 text-rose-500 font-extrabold text-[10px]">90 Days Safe margin</span>
          </div>

          <div className="divide-y max-h-64 overflow-y-auto mt-2 dark:divide-slate-800">
            {expiringSoon.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 italic">No batches are near expiration. Excellent!</div>
            ) : (
              expiringSoon.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block">{p.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Batch No: {p.batchNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-red-500 font-bold block">{p.expiryDate}</span>
                    <span className="text-[10px] text-slate-450 block mt-0.5">Qty: {p.stockQty} unit</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default Reports;
