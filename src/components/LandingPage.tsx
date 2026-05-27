import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Login } from './Login';
import { ShieldCheck, Package, ShoppingCart, BookOpen } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { settings } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between relative overflow-hidden">
      
      {/* Background radial highlight - minimal & elegant */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <span className="text-lg select-none">{settings?.logo || '💊'}</span>
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white uppercase leading-none block">
              {settings?.pharmacyName || 'Zambesi ERP'}
            </span>
            <span className="text-[9px] font-black tracking-widest text-emerald-400 block mt-0.5 uppercase">
              Enterprise Suite
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/5 text-emerald-400 font-bold px-3 py-1 rounded-full text-[9px] uppercase border border-emerald-500/10 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-505 bg-emerald-400 animate-pulse" />
            Service Status: Live
          </span>
        </div>
      </header>

      {/* Hero Landing Content */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center flex-1">
        
        {/* Left Hand: Premium Value Proposition */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
            💊 Distributed Pharmacy Management
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-white uppercase">
            Pharmacy operations, <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent font-extrabold">
              Unified and Simplified
            </span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-xl leading-relaxed">
            Zambesi ERP coordinates stock levels, real-time sales checkpoints, inter-branch logistics workflows, and fully automated financial accounting ledger books on a reliable, responsive, and secure platform.
          </p>

          {/* Clean 3 Benefit Items */}
          <div className="space-y-4 pt-4 max-w-lg">
            <div className="flex gap-3.5 items-start">
              <div className="p-1 text-emerald-400 mt-0.5">
                <ShoppingCart className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Omnichannel POS Checkout</h4>
                <p className="text-slate-450 text-xs mt-0.5">Real-time stock deduction, customized discount structures, and direct thermal/PDF receipt print formatting.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="p-1 text-emerald-400 mt-0.5">
                <Package className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Advanced Inventory Control</h4>
                <p className="text-slate-455 text-slate-400 text-xs mt-0.5">Track batches, expiry dates, stock movements, and automate inter-branch transfer orders with multi-author review states.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="p-1 text-emerald-400 mt-0.5">
                <BookOpen className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Double-Entry Accounting Package</h4>
                <p className="text-slate-455 text-slate-400 text-xs mt-0.5">Live transaction bookkeeping, ledger journals, tax filings, custom expense trackers, and automated branch performance metrics.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hand: Pristine, Embedded Auth Module */}
        <div className="lg:col-span-5 flex justify-center w-full">
          <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-2xl p-6 md:p-8 relative">
            {/* Soft decorative shadow accent under form box */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-5 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="mb-4 text-center">
                <span className="text-[9px] font-black text-emerald-400 tracking-widest font-mono uppercase block">
                  Secure Gateway
                </span>
                <h3 className="text-lg font-bold text-white mt-1 uppercase">
                  Operator Login
                </h3>
              </div>

              {/* Embed Login seamlessly */}
              <Login inline={true} />
            </div>
          </div>
        </div>

      </main>

      {/* Footer bar */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-6 py-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-550 text-slate-500 gap-3">
        <div>
          <span>Zambesi ERP Node System · Multi-Branch Managed Console</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400/80 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Authenticated Connection
          </span>
          <span className="text-slate-800">|</span>
          <span>© 2026 Zambesi Inc. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
};
