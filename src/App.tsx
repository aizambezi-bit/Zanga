import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Transfers } from './components/Transfers';
import { Accounting } from './components/Accounting';
import { Reports } from './components/Reports';
import { UsersManagement } from './components/Users';
import { BranchesManagement } from './components/Branches';
import { Settings } from './components/Settings';

const AppContent: React.FC = () => {
  const { profile, loading } = useAuth();
  
  // Navigation trigger
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-white">
        <div className="h-8 w-8 rounded-full border-4 border-sky-400 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-mono tracking-widest font-bold">BOOTING ZAMBEZI ERP V1...</span>
      </div>
    );
  }

  if (!profile) {
    return <Login />;
  }

  // Render subcomponents according to navigation selection
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'pos':
        return <POS />;
      case 'inventory':
        return <Inventory />;
      case 'transfers':
        return <Transfers />;
      case 'accounting':
        return <Accounting />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UsersManagement />;
      case 'branches':
        return <BranchesManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* Dynamic Navigation Drawer Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />

      {/* Main Content Area */}
      <main className={`transition-all duration-300 min-h-screen pt-4 pb-12 px-4 md:px-8 ${
        collapsed ? 'ml-16' : 'ml-16 md:ml-64'
      }`}>
        <div className="max-w-7xl mx-auto">
          {renderTabContent()}
        </div>
      </main>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
