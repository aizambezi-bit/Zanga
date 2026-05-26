import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Settings as SettingsIcon, 
  Store, 
  Lock, 
  HelpCircle, 
  Check, 
  Sparkles,
  RefreshCw 
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { profile, settings } = useAuth();
  
  // Form State
  const [pharmacyName, setPharmacyName] = useState('');
  const [currency, setCurrency] = useState('$');
  const [taxRate, setTaxRate] = useState(15);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  const [saving, setSaving] = useState(false);

  // Sync settings when loaded
  useEffect(() => {
    if (settings) {
      setPharmacyName(settings.pharmacyName || '');
      setCurrency(settings.currency || '$');
      setTaxRate(settings.taxRate ?? 15);
      setLowStockThreshold(settings.lowStockThreshold ?? 10);
      setAddress(settings.address || '');
      setLogoUrl(settings.logoUrl || '');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== 'admin') {
      alert('Only general administrators may change corporate settings.');
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'global');
      await updateDoc(docRef, {
        pharmacyName,
        currency,
        taxRate: Number(taxRate),
        lowStockThreshold: Number(lowStockThreshold),
        address,
        logoUrl,
        updatedAt: new Date().toISOString()
      });
      alert('Global configuration values successfully updated across all stores.');
    } catch (err: any) {
      console.error(err);
      alert(`Settings update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-sky-600 dark:text-sky-450" /> System Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure ERP variables, default currency indicators, tax computations and low-stock alarms.
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs md:text-sm">
          
          <h3 className="font-bold border-b pb-2 text-slate-800 dark:text-white flex items-center gap-1.5 dark:border-slate-800">
            <Store className="h-4.5 w-4.5 text-indigo-505" /> General Pharmacy Profile
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Company Registered Name</label>
              <input
                type="text"
                disabled={profile?.role !== 'admin'}
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="e.g. MediStore Health Group Ltd"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none disabled:bg-slate-50 focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">HQ Corporate Address</label>
              <input
                type="text"
                disabled={profile?.role !== 'admin'}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="HQ building, Parkway Ave"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none disabled:bg-slate-50 focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Preferred Currency Symbol</label>
              <input
                type="text"
                disabled={profile?.role !== 'admin'}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="e.g. $, R, Kw, etc."
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none disabled:bg-slate-50 focus:border-sky-500 dark:border-slate-850 dark:bg-slate-950 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Sales Tax computation rate (%)</label>
              <input
                type="number"
                disabled={profile?.role !== 'admin'}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                placeholder="e.g. 15"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none disabled:bg-slate-50 focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Low-Stock Alert Level Threshold</label>
              <input
                type="number"
                disabled={profile?.role !== 'admin'}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                placeholder="e.g. 10"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none disabled:bg-slate-50 focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Custom Brand Logo Emoji</label>
              <input
                type="text"
                disabled={profile?.role !== 'admin'}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="e.g. 💊 or 🏥"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none disabled:bg-slate-50 focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold"
              />
            </div>
          </div>

          {profile?.role !== 'admin' ? (
            <div className="p-3 bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900 rounded-xl flex items-center gap-2 mt-4 text-[11px] text-amber-700 select-none">
              <Lock className="h-4 w-4" /> Editing is restricted. Only standard administrators may edit these parameters.
            </div>
          ) : (
            <div className="flex justify-end pt-4 border-t dark:border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold leading-none flex items-center gap-1 transition"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Configurations
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50/40 border border-dashed border-amber-200 dark:bg-indigo-950/10 dark:border-indigo-900/40">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" /> Auto-sync operational
        </h4>
        <p className="text-[11px] text-slate-500 mt-1 dark:text-slate-400">
          Any configuration parameters specified on this screen synchronize instantaneously with each active POS terminal, chart reporter and stock replenishment ledger without rebuilding the web app.
        </p>
      </div>

    </div>
  );
};
export default Settings;
