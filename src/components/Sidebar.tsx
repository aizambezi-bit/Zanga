import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  ArrowLeftRight, 
  Users, 
  MapPin, 
  BookOpen, 
  TrendingUp, 
  Settings, 
  LogOut,
  Building,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed 
}) => {
  const { profile, settings, logoutUser, branches } = useAuth();
  
  if (!profile) return null;

  const currentBranch = branches.find(b => b.id === profile.branchId);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'assistant', 'cashier'] },
    { id: 'pos', label: 'POS System', icon: ShoppingCart, roles: ['admin', 'manager', 'assistant', 'cashier'] },
    { id: 'inventory', label: 'Stock / Products', icon: Package, roles: ['admin', 'manager', 'assistant'] },
    { id: 'transfers', label: 'Inter-Branch Stock', icon: ArrowLeftRight, roles: ['admin', 'manager', 'cashier'] },
    { id: 'accounting', label: 'Accounting Book', icon: BookOpen, roles: ['admin', 'manager'] },
    { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, roles: ['admin', 'manager'] },
    { id: 'users', label: 'Employees / Users', icon: Users, roles: ['admin'] },
    { id: 'branches', label: 'Branches CRM', icon: MapPin, roles: ['admin'] },
    { id: 'settings', label: 'System Settings', icon: Settings, roles: ['admin'] },
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(profile.role));

  const handleSignout = async () => {
    if (confirm('Are you sure you want to sign out of the system?')) {
      await logoutUser();
    }
  };

  return (
    <aside 
      className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-slate-950 text-slate-100 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } border-r border-slate-900`}
    >
      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-xl select-none">{settings?.logo || '💊'}</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-white font-extrabold text-sm tracking-tight leading-tight uppercase font-display">
                {settings?.pharmacyName || 'Zambesi ERP'}
              </h1>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                v2.4 Production
              </p>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 transition"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Operator Info card */}
      {!collapsed && (
        <div className="p-4 mx-3 my-4 bg-slate-900/50 rounded-2xl border border-slate-900 backdrop-blur-sm self-stretch">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 font-bold flex items-center justify-center text-emerald-400">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate">{profile.displayName}</h4>
              <p className="text-[10px] text-slate-400 capitalize flex items-center gap-1 mt-0.5">
                <UserCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                {profile.role}
              </p>
            </div>
          </div>
          
          <div className="mt-3 pt-2.5 border-t border-slate-900 text-[10px] text-slate-400 flex items-center gap-1.5 leading-snug">
            <Building className="h-3 w-3 shrink-0 text-emerald-400" />
            <span className="truncate">
              {profile.role === 'admin' ? 'Global Access' : `Branch: ${currentBranch?.name || 'Unassigned'}`}
            </span>
          </div>
        </div>
      )}

      {/* Navigation list */}
      <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
        <div className="hidden lg:block px-3 py-1 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Main Hub</div>
        {allowedItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-white border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <IconComponent className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-2 border-t border-slate-900 bg-slate-950">
        <button
          onClick={handleSignout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition duration-150 border border-transparent hover:border-rose-500/20"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0 text-rose-500" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
