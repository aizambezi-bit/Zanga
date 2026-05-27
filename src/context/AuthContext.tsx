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
        const defaultSettings: PharmacySettings = {
          pharmacyName: 'Zambezi Wellness Pharmacy',
          logo: '💊',
          currency: 'ZMW',
          taxRate: 15, // 15% VAT standard
          receiptFooter: 'Thank you for shopping with Zambezi Wellness!',
          invoicePrefix: 'ZW-INV-',
          lowStockThreshold: 10,
          printerThermalWidth: '80mm',
          themeColor: '#0ea5e9'
        };
        await setDoc(settingsRef, defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error('Error getting settings:', err);
    }
  };

  // Helper to load branches and seed if empty
  const fetchBranches = async () => {
    try {
      const branchesRef = collection(db, 'branches');
      const snap = await getDocs(branchesRef);
      if (!snap.empty) {
        const branchList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Branch[];
        setBranches(branchList);
      } else {
        // Seed default branches
        const batch = writeBatch(db);
        const mainRef = doc(branchesRef, 'b-main');
        const secondaryRef = doc(branchesRef, 'b-north');
        
        const mainBranch: Branch = {
          id: 'b-main',
          name: 'Central Plaza (HQ)',
          code: 'MAIN',
          address: '456 Independence Avenue, Lusaka',
          phone: '+260 970 001122',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const northBranch: Branch = {
          id: 'b-north',
          name: 'Northern Gate Clinic',
          code: 'NGATE',
          address: '12 Medical Way, Kitwe',
          phone: '+260 960 334455',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        batch.set(mainRef, mainBranch);
        batch.set(secondaryRef, northBranch);
        await batch.commit();
        setBranches([mainBranch, northBranch]);
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
        const isDefaultAdmin = firebaseUser.email === 'aizambezi@gmail.com';
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Pharmacy Operator',
          email: firebaseUser.email || '',
          role: isDefaultAdmin ? 'admin' : 'cashier',
          branchId: 'b-main', // default branch
          active: true,
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
      logoutUser
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
