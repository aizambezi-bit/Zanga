import React, { useState } from 'react';
import { loginWithGoogle, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, Sparkles, PlusCircle } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export const Login: React.FC = () => {
  const { loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorStatus(null);
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err?.message || 'Failed to authenticate via Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);
    if (!email || !password) {
      setErrorStatus('Please complete all credential fields.');
      return;
    }
    setAuthLoading(true);

    try {
      if (isRegisterMode) {
        if (!displayName) {
          setErrorStatus('Please enter your full name.');
          setAuthLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        // Auth state observer in AuthContext handles saving the profile object
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setErrorStatus('No user account corresponds to this email. Toggle back to Register Mode below.');
      } else if (err.code === 'auth/wrong-password') {
        setErrorStatus('Incorrect password. Please try again.');
      } else if (err.code === 'auth/weak-password') {
        setErrorStatus('Password should be at least 6 characters.');
      } else {
        setErrorStatus(err.message || 'Authentication failed.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const fillQuickDemo = (role: 'admin' | 'cashier' | 'manager') => {
    if (role === 'admin') {
      setEmail('aizambezi@gmail.com');
      setPassword('admin123');
      setDisplayName('Super Admin');
    } else if (role === 'manager') {
      setEmail('manager-north@zambezi.com');
      setPassword('manager123');
      setDisplayName('Kitwe Manager');
    } else {
      setEmail('cashier-lusaka@zambezi.com');
      setPassword('cashier123');
      setDisplayName('Lusaka Cashier');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 font-sans transition-colors">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 transition-all bento-card">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500 text-2xl shadow-lg shadow-emerald-500/20 text-white">
            💊
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display uppercase">
            Zambesi Web ERP
          </h2>
          <p className="mt-2 text-xs text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-widest">
            Enterprise Pharmacy & POS System
          </p>
        </div>

        {errorStatus && (
          <div className="mt-6 flex gap-2 items-start rounded-xl bg-red-100 p-3 text-xs md:text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/20">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>{errorStatus}</div>
          </div>
        )}

        <form onSubmit={handleEmailAction} className="mt-6 space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dr. Mercy Phiri"
                className="w-full rounded-xl border border-slate-205 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
              Operator Email
            </label>
            <input
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@zambezi.com"
              className="w-full rounded-xl border border-slate-205 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-205 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-4 py-2.5 text-xs font-black uppercase tracking-wider transition shadow-md disabled:opacity-50"
          >
            {authLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {isRegisterMode ? 'Complete Registration' : 'Secure Login'}
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 dark:bg-slate-900 dark:text-slate-400 text-[10px] tracking-widest font-bold">
              Third Party Login
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading || authLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 transition"
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.13-.19-.24-.26-.35z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google Authentication sso
        </button>

        {/* Demo Fast Account Selectors for Examiners evaluation */}
        <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[10px] font-black   text-slate-500 max-w-full dark:text-slate-400 uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Developer bypass profiles:</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setIsRegisterMode(true);
                fillQuickDemo('admin');
              }}
              className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 py-2 text-[10px] font-bold uppercase transition text-center border border-emerald-500/10"
            >
              Set Admin
            </button>
            <button
              onClick={() => {
                setIsRegisterMode(true);
                fillQuickDemo('manager');
              }}
              className="rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 py-2 text-[10px] font-bold uppercase transition text-center border border-teal-500/10"
            >
              Set Manager
            </button>
            <button
              onClick={() => {
                setIsRegisterMode(true);
                fillQuickDemo('cashier');
              }}
              className="rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 py-2 text-[10px] font-bold uppercase transition text-center border border-amber-500/10"
            >
              Set Cashier
            </button>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 text-center font-medium leading-relaxed">
            *Choose profile, click "Complete Registration" to bypass manual setup.
          </div>
        </div>

        <div className="mt-6 text-center text-xs">
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrorStatus(null);
            }}
            className="text-emerald-500 hover:underline font-bold dark:text-emerald-400"
          >
            {isRegisterMode ? 'Already registered? Return to Login' : 'Register a new Operator account'}
          </button>
        </div>
      </div>
    </div>
  );
};
