import React, { useState } from 'react';
import { loginWithGoogle, auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, PlusCircle } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export const Login: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
  const { loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleCopyHostname = () => {
    navigator.clipboard.writeText(window.location.hostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleLogin = async () => {
    setErrorStatus(null);
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      const isAuthDomainErr = err?.message?.includes('unauthorized-domain') || err?.code === 'auth/unauthorized-domain';
      if (isAuthDomainErr) {
        setErrorStatus('auth/unauthorized-domain');
      } else {
        setErrorStatus(err?.message || 'Failed to authenticate via Google.');
      }
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        
        // Check if settings/global doc exists to determine if this is the first registration
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        const isFirstUser = !settingsSnap.exists();
        const isDefaultAdmin = email === 'aizambezi@gmail.com' || isFirstUser;
        
        const initialProfile: UserProfile = {
          uid: userCredential.user.uid,
          displayName: displayName,
          email: email,
          role: isDefaultAdmin ? 'admin' : 'cashier',
          branchId: 'b-main', // placeholder initially
          active: isDefaultAdmin ? true : false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), initialProfile);
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

  const cardContent = (
    <div className={`w-full max-w-md ${inline ? 'p-0 bg-transparent border-none shadow-none' : 'rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900'} transition-all bento-card`}>
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
        <div className="mt-6 flex gap-2.5 items-start rounded-2xl bg-red-50 dark:bg-red-950/20 p-4 text-xs md:text-sm text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-800/10 shadow-sm leading-relaxed">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-grow min-w-0">
            {errorStatus === 'auth/unauthorized-domain' ? (
              <div className="space-y-3.5">
                <div>
                  <h4 className="font-extrabold text-[11px] tracking-wider uppercase text-red-700 dark:text-red-300">
                    Firebase Authorized Domain Required
                  </h4>
                  <p className="mt-1 text-slate-600 dark:text-slate-300 text-xs">
                    The currently loaded domain is not whitelisted by your Firebase Auth settings. This is standard for sandbox and Cloud Run previews.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Your Hostname
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHostname}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:bg-emerald-700 transition"
                    >
                      {copied ? 'Copied ✅' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-800 dark:text-slate-300 select-all break-all font-semibold leading-none">
                    {window.location.hostname}
                  </div>
                </div>

                <div className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-200">How to authorize:</div>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-emerald-500 dark:text-emerald-450 font-bold hover:underline">Firebase Console</a>.</li>
                    <li>Select project ➔ Buy/Build ➔ <strong>Authentication</strong>.</li>
                    <li>Go to the <strong>Settings</strong> tab ➔ <strong>Authorized Domains</strong> setting.</li>
                    <li>Click <strong>Add domain</strong> and paste the copied hostname.</li>
                  </ol>
                </div>

                <hr className="border-red-200/20 dark:border-red-950/40" />

                <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  ⚡ <strong>Tip:</strong> If you do not wish to configure this now, feel free to register or sign in using the <strong>Email & Password Form</strong> below! There is no whitelisting required for email authentication.
                </div>
              </div>
            ) : (
              <div className="font-medium text-xs md:text-sm">{errorStatus}</div>
            )}
          </div>
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
              className="w-full rounded-xl border border-slate-300 bg-white dark:bg-white px-3.5 py-2.5 text-sm text-black dark:text-black placeholder-slate-400 outline-none transition focus:border-emerald-500"
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
            className="w-full rounded-xl border border-slate-300 bg-white dark:bg-white px-3.5 py-2.5 text-sm text-black dark:text-black placeholder-slate-400 outline-none transition focus:border-emerald-500"
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
            className="w-full rounded-xl border border-slate-300 bg-white dark:bg-white px-3.5 py-2.5 text-sm text-black dark:text-black placeholder-slate-400 outline-none transition focus:border-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || authLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-4 py-2.5 text-xs font-black uppercase tracking-wider transition shadow-md disabled:opacity-50 cursor-pointer animate-none"
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
          <span className="bg-white px-2 text-slate-400 dark:bg-slate-950 dark:text-slate-450 text-[10px] tracking-widest font-bold">
            Third Party Login
          </span>
        </div>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading || authLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-5  dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/60 transition cursor-pointer"
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

      <div className="mt-6 text-center text-xs">
        <button
          onClick={() => {
            setIsRegisterMode(!isRegisterMode);
            setErrorStatus(null);
          }}
          className="text-emerald-500 hover:underline font-bold dark:text-emerald-450 cursor-pointer"
        >
          {isRegisterMode ? 'Already registered? Return to Login' : 'Register a new Operator account'}
        </button>
      </div>
    </div>
  );

  if (inline) {
    return cardContent;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 font-sans transition-colors">
      {cardContent}
    </div>
  );
};
