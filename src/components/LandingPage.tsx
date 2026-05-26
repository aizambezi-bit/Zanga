import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Login } from './Login';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  MapPin, 
  DollarSign, 
  Activity, 
  Layers, 
  ShieldCheck, 
  Calendar,
  Layers3,
  Clock,
  Printer,
  ChevronRight,
  Database,
  ArrowUpRight
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { settings } = useAuth();
  
  // Interactive simulator state
  const [cart, setCart] = useState<Array<{ name: string; price: number; qty: number }>>([]);
  const [selectedBranch, setSelectedBranch] = useState('Lusaka Main');
  const [showReceipt, setShowReceipt] = useState(false);
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const demoMeds = [
    { id: 1, name: 'Amoxicillin 500mg', category: 'Antibiotics', price: 12.50, stock: 450 },
    { id: 2, name: 'Paracetamol 500mg', category: 'Analgesics', price: 2.20, stock: 1200 },
    { id: 3, name: 'Ventolin Inhaler', category: 'Respiratory', price: 34.00, stock: 85 },
  ];

  const addToCart = (med: typeof demoMeds[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.name === med.name);
      if (existing) {
        return prev.map(item => item.name === med.name ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { name: med.name, price: med.price, qty: 1 }];
    });
    setShowReceipt(false);
  };

  const cartTotal = cart.reduce((add, item) => add + (item.price * item.qty), 0);
  const cartTax = cartTotal * 0.16;
  const grandTotal = cartTotal + cartTax;

  const handleClear = () => {
    setCart([]);
    setShowReceipt(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col justify-between">
      
      {/* Background Ambience Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-xl select-none">{settings?.logo || '💊'}</span>
          </div>
          <div>
            <span className="font-display font-extrabold text-sm tracking-tight text-white uppercase leading-none block">
              {settings?.pharmacyName || 'Zambesi ERP'}
            </span>
            <span className="text-[9px] font-black tracking-widest text-emerald-400 block mt-0.5 uppercase">
              V2.4 Enterprise
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-450 font-mono text-[10px]">
            <Database className="h-3 w-3 text-emerald-400" />
            Connected: <span className="text-emerald-300 font-bold">zanga-zanga-79386</span>
          </span>
          <span className="bg-emerald-500/10 text-emerald-400 font-extrabold px-3 py-1.5 rounded-full text-[10px] uppercase border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Client Sync Available
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-1">
        
        {/* Left Hand: Enterprise Bento Overview & Live Simulator */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          
          {/* Welcome Intro Hero card */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/40 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Unified Pharmacy ERP Suite
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-white font-display uppercase">
              Modern stock routing, <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">Bento-designed</span> dispatch.
            </h1>
            
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              Zambesi ERP coordinates pharmaceutical logistics across unlimited physical branches. Handle real-time stock deduction, batches, dual-tax rules, and integrated bookkeeping ledger.
            </p>
          </div>

          {/* Interactive Bento Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            
            {/* Feature 1: POS Simulator Panel */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/15 rounded-lg text-emerald-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Fast POS Checkout</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{timeStr}</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-2.5 leading-relaxed">
                  Click a medicine item below to queue an instant sale transaction and generate a receipt simulation:
                </p>

                {/* Simulated item clickers */}
                <div className="mt-3.5 space-y-2">
                  {demoMeds.map(med => (
                    <button
                      key={med.id}
                      onClick={() => addToCart(med)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-white/5 hover:border-slate-700 text-left transition group"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition">{med.name}</div>
                        <div className="text-[9px] text-slate-500">{med.category} · {med.stock} units left</div>
                      </div>
                      <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                        ${med.price.toFixed(2)}
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 border-t border-white/5 pt-2 flex justify-between items-center bg-slate-900/10">
                <span>Supports handheld scanners list</span>
                <span className="font-bold text-emerald-500">Offline-capable</span>
              </div>
            </div>

            {/* Feature 2: Active Receipt Previewer simulation */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-3xl p-5 shadow-sm flex flex-col justify-between overflow-hidden relative">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="w-12 h-12 bg-slate-950 rounded-full flex items-center justify-center mb-3 text-slate-600 border border-white/5 shadow-inner">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h4 className="text-slate-300 text-xs font-bold">Simulator Receipt</h4>
                  <p className="text-slate-500 text-[10px] max-w-[180px] mt-1 leading-snug">
                    Select medicines on the left to see the instant automated cash tally index.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-dashed border-slate-800 pb-2 mb-2.5">
                      <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">MOCK COUNTER RECEIPT</span>
                      <button 
                        onClick={handleClear}
                        className="text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase font-bold"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {cart.map((item, index) => (
                        <div key={index} className="flex justify-between text-[11px] text-slate-300 font-mono">
                          <span className="truncate max-w-[125px]">{item.qty}x {item.name}</span>
                          <span>${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-slate-800 pt-2.5 mt-2.5 space-y-1 text-[11px] font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>Net Value:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT (16%):</span>
                        <span>${cartTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-black border-t border-dashed border-slate-800 pt-1 text-xs">
                        <span>GRAND TOTAL:</span>
                        <span className="text-emerald-400">${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowReceipt(true)}
                    className="w-full mt-3 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold text-[10px] text-slate-950 rounded-xl transition uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Simulate Thermal Print
                  </button>
                </div>
              )}

              {showReceipt && (
                <div className="absolute inset-0 bg-slate-900 border border-emerald-500/10 p-5 flex flex-col justify-between animate-fade-in text-white z-25">
                  <div className="text-center font-mono space-y-1">
                    <span className="text-xs font-black block">*** SIMULATED TICKET ***</span>
                    <span className="text-[10px] text-slate-400 block">ZAMBESI HEALTH PHARMACY</span>
                    <span className="text-[9px] text-slate-500 block">Date: {new Date().toLocaleDateString()}</span>
                    <div className="border-b border-slate-800 my-2" />
                    <div className="text-left text-[11px] space-y-1">
                      {cart.map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.qty} x {item.name}</span>
                          <span>${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-800 my-2 pt-1 font-bold text-emerald-400 flex justify-between text-[11px]">
                      <span>TOTAL:</span>
                      <span>${grandTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2">Cashier Ref: COUNTER DEMO 01</p>
                    <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1">✓ INVENTORY DISPATCHED SUCCESSFULLY</p>
                  </div>
                  <button 
                    onClick={() => setShowReceipt(false)}
                    className="w-full py-1.5 bg-slate-850 hover:bg-slate-800 text-[9px] uppercase font-bold rounded-lg mt-3"
                  >
                    Close Sheet
                  </button>
                </div>
              )}
            </div>

            {/* Feature 3: Branch Logistics Card */}
            <div className="col-span-1 border border-slate-850 bg-slate-900/60 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/15 rounded-lg text-amber-400">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Inter-Branch Logistics</span>
              </div>
              <p className="text-slate-450 text-[11px] leading-relaxed">
                Seamless request flow for out-of-stock items. Staff requests transfers directly from sister warehouses with live approval chains.
              </p>
              
              {/* Dummy Transfer request mock */}
              <div className="bg-slate-950/60 border border-white/5 p-3 rounded-2xl space-y-2 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-slate-400 uppercase font-black">REQ-9943 (Pending)</span>
                  <span className="bg-amber-500/10 text-amber-400 font-extrabold px-1.5 py-0.5 rounded text-[8px]">In Approval</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Item:</span>
                  <span className="text-slate-300 font-bold">Amoxicillin (60 units)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">From:</span>
                  <span className="text-slate-300">Central Warehouse</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">To:</span>
                  <span className="text-slate-300">Lusaka West Branch</span>
                </div>
              </div>
            </div>

            {/* Feature 4: Ledger Package Card */}
            <div className="col-span-1 border border-slate-850 bg-slate-900/60 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-500/15 rounded-lg text-sky-400">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Legible Bookkeeping</span>
              </div>
              <p className="text-slate-450 text-[11px] leading-relaxed">
                Auto-generates double-entry accounting journals for operations to calculate real-time Gross Profit Margin, assets, and tax tallies.
              </p>
              
              {/* Small status indicators line */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 block uppercase">Accounts Receivable</span>
                  <span className="text-white font-extrabold block mt-0.5">$14,230</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 block uppercase">Operating Cash</span>
                  <span className="text-emerald-400 font-extrabold block mt-0.5">$84,100</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Hand: Elegant Interactive Authenticator Console */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="relative">
            {/* Absolute accent light under login */}
            <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl blur-xl" />
            
            <div className="relative z-10 bg-slate-900 border border-slate-850 rounded-3xl shadow-2xl p-6 md:p-8">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest font-mono uppercase">
                    CONTROL TERMINAL GATEWAY
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white mt-1 font-display">
                  AUTHENTICATE AN ACCOUNT
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Access the ERP using Firebase auth or bypass directly.
                </p>
              </div>

              {/* Seamless embedding of Login module */}
              <div className="mt-4">
                <Login />
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer System Status Banner */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 gap-3 text-center md:text-left">
        <div>
          <span>Zambesi Distributed Infrastructure Client · Multi-Branch Enterprise Node</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Cloud Security Rules Configured
          </span>
          <span className="text-slate-600">|</span>
          <span>© 2026 Zambesi Inc. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
};
