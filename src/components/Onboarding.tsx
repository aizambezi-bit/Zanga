import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Store, 
  MapPin, 
  Phone, 
  Sparkles, 
  LogOut, 
  Check, 
  RefreshCw,
  Building,
  Key
} from 'lucide-react';
import { Branch, PharmacySettings } from '../types';

export const Onboarding: React.FC = () => {
  const { 
    profile, 
    settings, 
    logoutUser, 
    refreshProfile, 
    refreshSettingsState, 
    refreshBranchesState 
  } = useAuth();

  // Admin Flow State
  const [pharmacyName, setPharmacyName] = useState('');
  const [logo, setLogo] = useState('💊');
  const [hqBranchName, setHqBranchName] = useState('Central HQ Core');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('K');
  const [taxRate, setTaxRate] = useState(15);
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invite Flow State
  const [inviteCode, setInviteCode] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!pharmacyName.trim() || !address.trim() || !phone.trim() || !hqBranchName.trim()) {
      setErrorMsg('Please complete all fields to establish your Pharmacy Enterprise.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Write Settings global configuration
      const settingsRef = doc(db, 'settings', 'global');
      const pharmacyConfig: PharmacySettings = {
        pharmacyName: pharmacyName.trim(),
        logo: logo,
        currency: currency,
        taxRate: Number(taxRate) || 0,
        receiptFooter: `Thank you for choosing ${pharmacyName.trim()}!`,
        invoicePrefix: `${pharmacyName.trim().slice(0, 3).toUpperCase()}-INV-`,
        lowStockThreshold: 10,
        address: address.trim(),
        logoUrl: logo,
        onboarded: true
      };

      // 2. Create the primary Central HQ physical branch
      const branchId = 'b-main';
      const branchRef = doc(db, 'branches', branchId);
      const mainBranch: Branch = {
        id: branchId,
        name: hqBranchName.trim(),
        code: 'MAIN',
        address: address.trim(),
        phone: phone.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const batch = writeBatch(db);
      batch.set(settingsRef, pharmacyConfig);
      batch.set(branchRef, mainBranch);

      // 3. Update the creator's profile
      if (profile) {
        const userRef = doc(db, 'users', profile.uid);
        batch.update(userRef, {
          role: 'admin',
          branchId: branchId,
          active: true,
          updatedAt: new Date().toISOString()
        });
      }

      await batch.commit();

      // Trigger context re-fetch
      await refreshSettingsState();
      await refreshBranchesState();
      await refreshProfile();

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Setup transaction failed. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    const code = inviteCode.trim();
    if (!code) {
      setInviteError('Please enter a valid invitation code.');
      return;
    }

    setInviteSubmitting(true);
    try {
      // Fetch corresponding invite code document
      const inviteRef = doc(db, 'invites', code);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        setInviteError('Invalid invitation code. Check coordinates and spelling.');
        setInviteSubmitting(false);
        return;
      }

      const inviteData = inviteSnap.data();
      if (!inviteData.active) {
        setInviteError('This invitation has already been claimed or deactivated.');
        setInviteSubmitting(false);
        return;
      }

      // Claim Invite & elevate User status in atomic batch
      const batch = writeBatch(db);

      // Consume invite code
      batch.update(inviteRef, {
        active: false,
        claimedBy: profile?.uid,
        claimedAt: new Date().toISOString()
      });

      // Elevate profile permissions matching the invite
      if (profile) {
        const userRef = doc(db, 'users', profile.uid);
        batch.update(userRef, {
          role: inviteData.role,
          branchId: inviteData.branchId,
          active: true,
          inviteCode: code,
          updatedAt: new Date().toISOString()
        });
      }

      await batch.commit();
      
      setInviteSuccess('Activation successful! Welcome to the team.');
      
      // Refresh context
      await refreshProfile();
      await refreshSettingsState();
      await refreshBranchesState();

    } catch (err: any) {
      console.error(err);
      setInviteError(err.message || 'Failed to apply invitation code.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setInviteSubmitting(true);
    try {
      await refreshProfile();
      await refreshSettingsState();
      await refreshBranchesState();
    } catch (err) {
      console.error(err);
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Switch onboarding layouts based on user roles
  const isAdminOrFirstUser = profile?.role === 'admin' || !settings?.onboarded;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      
      {/* Dynamic background lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Panel */}
      <header className="relative z-10 max-w-5xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <span className="text-lg">💊</span>
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white uppercase leading-none block">
              Zambesi ERP
            </span>
            <span className="text-[9px] font-black tracking-widest text-emerald-400 block mt-0.5 uppercase">
              Onboarding Center
            </span>
          </div>
        </div>

        <button 
          onClick={logoutUser}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit Session
        </button>
      </header>

      {/* Primary Workspace */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-6 py-12 md:py-16 flex-1 flex flex-col items-center justify-center">
        
        {isAdminOrFirstUser ? (
          /* ADMIN ONBOARDING FLOW */
          <div className="w-full max-w-2xl bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6 relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-5 pointer-events-none" />
            
            <div className="text-center space-y-2 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/15 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> Initialize Enterprise Store
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Setup Your Pharmacy ERP
              </h2>
              <p className="text-slate-400 text-xs md:text-sm max-w-md mx-auto">
                Establish corporate settings, base credentials, and your first primary operating headquarters branch.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/20 border border-red-500/10 text-red-400 rounded-xl text-xs font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdminSetup} className="space-y-4 text-xs md:text-sm relative z-10">
              
              <div className="grid gap-4 sm:grid-cols-12">
                <div className="sm:col-span-8">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                    Pharmacy Name
                  </label>
                  <input
                    type="text"
                    required
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="e.g. Apex Wellness Pharmacies"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                    Brand Logo Emoji
                  </label>
                  <select
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-emerald-500 text-center font-bold"
                  >
                    <option value="💊">💊 Capsule</option>
                    <option value="🏥">🏥 Hospital</option>
                    <option value="⚕️">⚕️ Medical Rod</option>
                    <option value="🧪">🧪 Test Tube</option>
                    <option value="🌿">🌿 Herb Plant</option>
                    <option value="❤️">❤️ Wellness Heart</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                    Base Currency Indicator
                  </label>
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="e.g. ZMW, $, K"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                    Base Sales VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    placeholder="e.g. 15"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Building className="w-4 h-4" /> Headquarters Primary Branch
                </h3>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                    HQ Branch Outlet Name
                  </label>
                  <input
                    type="text"
                    required
                    value={hqBranchName}
                    onChange={(e) => setHqBranchName(e.target.value)}
                    placeholder="e.g. Lusaka Central Hub (HQ)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                      HQ Physical Location Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-600" />
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 456 Independence Avenue, Lusaka"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                      HQ Branch Telephone No.
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-600" />
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+260..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Establish Setup...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Finalize Pharmacy Onboarding
                  </>
                )}
              </button>

            </form>
          </div>
        ) : (
          /* WORKER ACTIVATION GATE */
          <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-blue-500 rounded-3xl blur opacity-5 pointer-events-none" />
            
            <div className="text-center space-y-2 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/5 border border-teal-500/15 rounded-full text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                🛡️ Operator Gateway
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Verify Credentials
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Welcome, <span className="text-white font-bold">{profile?.displayName}</span>! Your operator profile is currently in an unactivated state.
              </p>
            </div>

            {inviteError && (
              <div className="p-3 bg-red-950/20 border border-red-500/10 text-red-400 rounded-xl text-xs font-semibold text-center">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 rounded-xl text-xs font-semibold text-center">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInviteClaim} className="space-y-4 text-xs md:text-sm relative z-10">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                  Enter Invitation Code
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. INV-A9B8C7"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-teal-500 font-mono tracking-widest text-center"
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/10"
                >
                  {inviteSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Claim Invite & Join'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={inviteSubmitting}
                  className="px-3 border border-white/10 hover:bg-white/5 rounded-xl transition flex items-center justify-center text-slate-400 hover:text-white"
                  title="Check manual activation status"
                >
                  <RefreshCw className={`w-4 h-4 ${inviteSubmitting ? 'animate-spin' : ''}`} />
                </button>
              </div>

            </form>

            <div className="text-center pt-2 relative z-10">
              <span className="text-[10px] text-slate-500">
                You can also ask your Administrator to manually approve your registration using email address <b className="text-white font-mono">{profile?.email}</b> block.
              </span>
            </div>
          </div>
        )}

      </main>

      {/* Footer bar */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto px-6 py-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
        <div>
          <span>Zambesi ERP Node Onboarding Center</span>
        </div>
        <div>
          <span>Powered by Secure Firebase Authentication Engine</span>
        </div>
      </footer>

    </div>
  );
};
