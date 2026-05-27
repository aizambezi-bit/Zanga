import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, PharmacySettings, Branch } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  settings: PharmacySettings | null;
  branches: Branch[];
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateSettingsState: (newSettings: PharmacySettings) => void;
  refreshBranchesState: () => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshSettingsState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to load settings from FireStore with automatic seed fallback
  const fetchSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'global');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        setSettings(snap.data() as PharmacySettings);
      } else {
        setSettings(null);
      }
    } catch (err) {
      console.error('Error getting settings:', err);
    }
  };

  // Helper to load branches
  const fetchBranches = async () => {
    try {
      const branchesRef = collection(db, 'branches');
      const snap = await getDocs(branchesRef);
      if (!snap.empty) {
        const branchList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Branch[];
        setBranches(branchList);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const getProfileForUser = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Create initial profile
        // We check if settings/global doc exists. If it does not, this is the first workspace setup run, 
        // which makes this registering user the administrator to avoid permission/access issues.
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        const isFirstUser = !settingsSnap.exists();
        const isDefaultAdmin = firebaseUser.email === 'aizambezi@gmail.com' || isFirstUser;
        
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Pharmacy Operator',
          email: firebaseUser.email || '',
          role: isDefaultAdmin ? 'admin' : 'cashier',
          branchId: 'b-main', // placeholder initially
          active: isDefaultAdmin ? true : false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, initialProfile);
        setProfile(initialProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await getProfileForUser(user);
    }
  };

  const updateSettingsState = (newSettings: PharmacySettings) => {
    setSettings(newSettings);
  };

  const refreshBranchesState = async () => {
    await fetchBranches();
  };

  const logoutUser = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      setLoading(true);
      if (currentFirebaseUser) {
        setUser(currentFirebaseUser);
        await getProfileForUser(currentFirebaseUser);
        await fetchSettings();
        await fetchBranches();
      } else {
        setUser(null);
        setProfile(null);
        setSettings(null);
        setBranches([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      settings, 
      branches, 
      loading, 
      refreshProfile, 
      updateSettingsState,
      refreshBranchesState,
      logoutUser,
      refreshSettingsState: fetchSettings
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
