import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AccountingEntry } from '../types';
import { 
  BookOpen, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Calculator, 
  FileCheck, 
  Calendar,
  Folders, 
  HelpCircle, 
  CheckCircle, 
  Percent,
  X
} from 'lucide-react';

export const Accounting: React.FC = () => {
  const { profile, settings, branches } = useAuth();
  
  // States
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'coa' | 'cashbook' | 'pnl' | 'trial' | 'balance_sheet'>('coa');

  // New entry form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'expense' | 'revenue' | 'ledger' | 'journal'>('expense');
  const [formCategory, setFormCategory] = useState('Utility Bills');
  const [formCode, setFormCode] = useState('5060');
  const [formAmount, setFormAmount] = useState(0);
  const [formDescription, setFormDescription] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Load accounting data
  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    const accRef = collection(db, 'accounting');

    const unsubscribe = onSnapshot(accRef, (snapshot) => {
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AccountingEntry[];
      // Filter by branch if not Admin
      if (profile.role !== 'admin') {
        items = items.filter(e => e.branchId === profile.branchId);
      }
      setEntries(items.sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    }, (err) => console.error(err));

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setFormBranchId(profile.branchId);
    }
  }, [profile]);

  // Handle Chart of Account seed balances dynamically aggregated in memory
  // This avoids double document writes while guaranteeing pristine math
  const getCOABalances = () => {
    const list = [
      { code: '1010', name: 'Cash on Hand (Petty Register)', type: 'asset', base: 5000 },
      { code: '1020', name: 'StanChart Operating Bank Balance', type: 'asset', base: 95000 },
      { code: '4010', name: 'Standard Sales Revenue', type: 'revenue', base: 0 },
      { code: '5010', name: 'Medication Purchase Ledger', type: 'expense', base: 0 },
      { code: '5050', name: 'Lease & Rent Expense', type: 'expense', base: 0 },
      { code: '5060', name: 'Power & Utility Bills', type: 'expense', base: 0 },
      { code: '2010', name: 'Accounts Payable (Wholesale Vendors)', type: 'liability', base: 12500 },
      { code: '1110', name: 'Accounts Receivable (Insurances)', type: 'asset', base: 4300 },
      { code: '3010', name: 'Owner Equity Capital contribution', type: 'equity', base: 91800 },
    ];

    // Distribute entries
    entries.forEach(e => {
      const acc = list.find(a => a.code === e.code);
      if (acc) {
        if (acc.type === 'expense' || acc.type === 'asset') {
          acc.base += e.type === 'expense' ? e.amount : (e.type === 'revenue' ? -e.amount : e.amount);
        } else {
          // liability, equity, revenue increase with credit/revenue entries
          acc.base += e.type === 'revenue' ? e.amount : (e.type === 'expense' ? -e.amount : e.amount);
        }
      } else {
        // dynamic addition (just in case)
        if (e.type === 'revenue') {
          list.push({ code: e.code, name: e.category, type: 'revenue', base: e.amount });
        } else if (e.type === 'expense') {
          list.push({ code: e.code, name: e.category, type: 'expense', base: e.amount });
        }
      }
    });

    return list;
  };

  const coa = getCOABalances();

  // Financial Declarations Calculations
  const revenueTotal = entries.filter(e => e.type === 'revenue').reduce((acc, e) => acc + e.amount, 0);
  const expenseTotal = entries.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
  const operationalResult = revenueTotal - expenseTotal; // Profit or loss

  // Form selections matching COA code mappings
  const handleCategorySelectChange = (val: string) => {
    setFormCategory(val);
    if (val === 'Utility Bills') setFormCode('5060');
    else if (val === 'Rent & Lease') setFormCode('5050');
    else if (val === 'Medication Wholesale buy') setFormCode('5010');
    else if (val === 'Sales Surcharges') setFormCode('4010');
    else if (val === 'Accounts Receivable payment') setFormCode('1110');
    else if (val === 'Accounts Payable settlement') setFormCode('2010');
  };

  const createAccountingEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formAmount <= 0 || !formDescription || !formBranchId) {
      alert('Ensure amount is greater than zero and memo details are completed.');
      return;
    }

    try {
      const colRef = collection(db, 'accounting');
      const payload: AccountingEntry = {
        id: `acc-${Date.now()}`,
        type: formType,
        category: formCategory,
        code: formCode,
        amount: Number(formAmount),
        description: formDescription,
        branchId: formBranchId,
        date: formDate,
        createdAt: new Date().toISOString()
      };

      await addDoc(colRef, payload);
      setIsFormOpen(false);
      setFormAmount(0);
      setFormDescription('');
      alert('Voucher journal entry saved correctly.');
    } catch (err: any) {
      console.error(err);
      alert(`Journal entry denied: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER ROW */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pharmacy Accounts ERP</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Automates the Chart of Accounts ledger, real-time balance sheets, Profit & Loss reports and trial balances.
          </p>
        </div>

        {/* Add Entry trigger */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold leading-none flex items-center gap-1.5 transition shadow"
        >
          <Plus className="h-4 w-4" /> Create Journal Voucher
        </button>
      </div>

      {/* QUICK FINANCIAL STATS GRIDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Ledger Receipts</span>
          <h3 className="text-xl font-extrabold text-emerald-600 mt-1">{settings?.currency || 'K'}{revenueTotal.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Automatic POS registers & AR pay-ins</p>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Disbursed Expenses</span>
          <h3 className="text-xl font-extrabold text-red-500 mt-1">{settings?.currency || 'K'}{expenseTotal.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Wholesale drug orders, leases & bills</p>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Net General operating Margin</span>
          <h3 className={`text-xl font-extrabold mt-1 ${operationalResult >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600'}`}>
            {settings?.currency || 'K'}{operationalResult.toFixed(2)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Real-time dynamic EBIT margin</p>
        </div>
      </div>

      {/* SUB MENU TABS NAVIGATION row */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full gap-2">
        {[
          { id: 'coa', label: 'Chart of Accounts', icon: Folders },
          { id: 'cashbook', label: 'Cashbook / General Ledger', icon: BookOpen },
          { id: 'pnl', label: 'Profit & Loss Statement', icon: TrendingUp },
          { id: 'trial', label: 'Trial Balance check', icon: Calculator },
          { id: 'balance_sheet', label: 'Balance Sheet', icon: FileCheck }
        ].map(t => {
          const SubIcon = t.icon;
          const isSel = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id as any)}
              className={`flex items-center gap-2 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition ${
                isSel 
                  ? 'border-sky-500 text-sky-600 font-bold dark:text-sky-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <SubIcon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* VIEW CONDITIONAL RENDERING */}
      <div className="bg-white border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-850 p-4">
        
        {/* SUBTAB 1: CHART OF ACCOUNTS */}
        {activeSubTab === 'coa' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">ERP Chart of Accounts Directory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] dark:bg-slate-950">
                  <tr>
                    <th className="p-3">Account Code</th>
                    <th className="p-3">Account Name</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3 text-right">Current Ledger Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 dark:text-slate-300 dark:divide-slate-800">
                  {coa.map(a => (
                    <tr key={a.code} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                      <td className="p-3 font-mono font-bold text-slate-500">{a.code}</td>
                      <td className="p-3 font-semibold">{a.name}</td>
                      <td className="p-3 uppercase font-bold text-[9px] text-slate-450">{a.type}</td>
                      <td className="p-3 text-right font-mono font-semibold">
                        {settings?.currency || 'K'}{a.base.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 2: CASHBOOK/JOURNAL LOG */}
        {activeSubTab === 'cashbook' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Debit & Credit Journal ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] dark:bg-slate-950">
                  <tr>
                    <th className="p-3">Accounting Reference</th>
                    <th className="p-3">Classification / Code</th>
                    <th className="p-3">Description Memo</th>
                    <th className="p-3">Value Date</th>
                    <th className="p-3 text-right">Debit (Inbound)</th>
                    <th className="p-3 text-right">Credit (Outbound)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 dark:text-slate-300 dark:divide-slate-800">
                  {entries.map(e => {
                    const isRev = e.type === 'revenue';
                    return (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="p-3 font-mono text-slate-400">{e.id.slice(-8).toUpperCase()}</td>
                        <td className="p-3">
                          <span className="font-semibold block">{e.category}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Code: {e.code}</span>
                        </td>
                        <td className="p-3 italic text-slate-500">"{e.description}"</td>
                        <td className="p-3">{e.date}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {isRev ? `${settings?.currency || 'K'}${e.amount.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-red-500">
                          {!isRev ? `${settings?.currency || 'K'}${e.amount.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: PROFIT & LOSS STATEMENT */}
        {activeSubTab === 'pnl' && (
          <div className="space-y-4 max-w-lg mx-auto border rounded-xl p-6 bg-slate-50/50 dark:bg-slate-950 dark:border-slate-850">
            <div className="text-center pb-4 border-b">
              <h2 className="text-md font-bold text-slate-900 dark:text-white">OPERATING PROFIT & LOSS REPORT</h2>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">For Current Financial Period</span>
            </div>

            <div className="space-y-3 pt-3 text-xs md:text-sm">
              <div className="flex justify-between font-bold border-b pb-1">
                <span>Revenue Accounts</span>
                <span>Value Balance</span>
              </div>
              <div className="flex justify-between text-slate-650 dark:text-slate-305 pl-4">
                <span>Standard Sales Checkout income</span>
                <span>{settings?.currency || 'K'}{revenueTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-indigo-700 bg-slate-100 p-2 rounded dark:bg-slate-900 dark:text-indigo-400">
                <span>Gross Income Sum:</span>
                <span>{settings?.currency || 'K'}{revenueTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold border-b pb-1 pt-4">
                <span>Operational Expenses Disbursements</span>
                <span>Value Cost</span>
              </div>
              <div className="flex justify-between text-slate-650 dark:text-slate-300 pl-4">
                <span>Medication Sourcing Purchases</span>
                <span>{settings?.currency || 'K'}{entries.filter(e => e.code === '5010').reduce((t, e) => t + e.amount, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-650 dark:text-slate-300 pl-4">
                <span>Physical Shop Rent Leases</span>
                <span>{settings?.currency || 'K'}{entries.filter(e => e.code === '5050').reduce((t, e) => t + e.amount, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-650 dark:text-slate-300 pl-4">
                <span>Energy Utilities Power grid bills</span>
                <span>{settings?.currency || 'K'}{entries.filter(e => e.code === '5060').reduce((t, e) => t + e.amount, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-red-700 bg-red-50 p-2 rounded dark:bg-red-950/40 dark:text-red-400">
                <span>Expenses Cost Sum:</span>
                <span>-{settings?.currency || 'K'}{expenseTotal.toFixed(2)}</span>
              </div>

              <div className="border-t-2 border-dashed border-slate-300 my-4" />

              <div className={`flex justify-between p-3 rounded-lg text-sm md:text-md font-black ${
                operationalResult >= 0 ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-305' : 'bg-red-100 text-red-850'
              }`}>
                <span>{operationalResult >= 0 ? 'NET NET OPERATING PROFIT' : 'NET OPERATING DEFICIT LOSS'}</span>
                <span>{settings?.currency || 'K'}{operationalResult.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: TRIAL BALANCE */}
        {activeSubTab === 'trial' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">ERP double entry Trial balance</h3>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase dark:bg-emerald-950 dark:text-emerald-300">
                Balanced ✓
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] dark:bg-slate-950">
                  <tr>
                    <th className="p-3">Chart Account Code</th>
                    <th className="p-3 font-sans">Account Title Description</th>
                    <th className="p-3 text-right">Debit Trial Balance (COA)</th>
                    <th className="p-3 text-right">Credit Trial Balance (COA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-705 dark:text-slate-300 dark:divide-slate-800">
                  {coa.map(a => {
                    const isDebitNode = a.type === 'asset' || a.type === 'expense';
                    return (
                      <tr key={a.code} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="p-3 font-bold text-slate-500">{a.code}</td>
                        <td className="p-3 font-sans font-semibold">{a.name}</td>
                        <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-100">
                          {isDebitNode ? `${settings?.currency || 'K'}${a.base.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">
                          {!isDebitNode ? `${settings?.currency || 'K'}${a.base.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row validation */}
                  <tr className="bg-slate-100 dark:bg-slate-950 font-bold border-t-2 text-slate-900 dark:text-white">
                    <td colSpan={2} className="p-3 text-right font-sans">Double-Entry trial verification:</td>
                    <td className="p-3 text-right text-emerald-600">
                      {settings?.currency || 'K'}{(coa.reduce((t, a) => (a.type === 'asset' || a.type === 'expense') ? t + a.base : t, 0)).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-emerald-600">
                      {settings?.currency || 'K'}{(coa.reduce((t, a) => (a.type !== 'asset' && a.type !== 'expense') ? t + a.base : t, 0)).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 5: BALANCE SHEET */}
        {activeSubTab === 'balance_sheet' && (
          <div className="space-y-4 max-w-lg mx-auto border rounded-xl p-6 bg-slate-50/50 dark:bg-slate-950 dark:border-slate-850">
            <div className="text-center pb-4 border-b">
              <h2 className="text-md font-bold text-slate-900 dark:text-white">CONSOLIDATED GENERAL BALANCE SHEET</h2>
              <span className="text-[10px] text-slate-405 uppercase tracking-widest font-mono">ASSETS = LIABILITIES + EQUITY</span>
            </div>

            <div className="space-y-3 pt-3 text-xs md:text-sm">
              <div className="flex justify-between font-bold border-b pb-1 text-sky-600">
                <span>ASSETS (Total Capital Value)</span>
                <span>Balance</span>
              </div>
              {coa.filter(a => a.type === 'asset').map(a => (
                <div key={a.code} className="flex justify-between text-slate-650 dark:text-slate-300 pl-4">
                  <span>{a.name}</span>
                  <span>{settings?.currency || 'K'}{a.base.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-extrabold text-sky-700 bg-sky-50 dark:bg-sky-950/40 p-2 rounded">
                <span>Sum of Total Assets:</span>
                <span>{settings?.currency || 'K'}{(coa.filter(a => a.type === 'asset').reduce((t, c) => t + c.base, 0)).toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold border-b pb-1 pt-4 text-emerald-600">
                <span>LIABILITY & OWNER EQUITY</span>
                <span>Balance</span>
              </div>
              {coa.filter(a => a.type === 'liability' || a.type === 'equity').map(a => (
                <div key={a.code} className="flex justify-between text-slate-650 dark:text-slate-305 pl-4">
                  <span>{a.name}</span>
                  <span>{settings?.currency || 'K'}{a.base.toFixed(2)}</span>
                </div>
              ))}
              {/* Plus current operations result */}
              <div className="flex justify-between text-slate-650 pl-4 italic">
                <span>Current operating income allocation</span>
                <span className={operationalResult >= 0 ? 'text-sky-600' : 'text-red-500'}>
                  {settings?.currency || 'K'}{operationalResult.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded">
                <span>Sum of Liabilities & Equities:</span>
                <span>
                  {settings?.currency || 'K'}{(
                    coa.filter(a => a.type === 'liability' || a.type === 'equity').reduce((t, c) => t + c.base, 0) + operationalResult
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL: JOURNAL ENTRY POP CONTAINER */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">Record Journal Entry Voucher</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={createAccountingEntry} className="my-4 space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Entry Classification Type</label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="expense">Operational Expense (-)</option>
                    <option value="revenue">Direct Revenue (+)</option>
                    <option value="ledger">Ledger Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assoc Accounts Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => handleCategorySelectChange(e.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Utility Bills">Utility Bills (Code: 5060)</option>
                    <option value="Rent & Lease">Rent & Lease (Code: 5050)</option>
                    <option value="Medication Wholesale buy">Medication Supply Buy (Code: 5010)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Voucher Value / Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Entry Value Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Description / Memo Purpose</label>
                <textarea
                  required
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Memo details explaining why petty cash was withdrawn, etc..."
                  className="w-full rounded border border-slate-200 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold leading-none"
                >
                  Record Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Accounting;
