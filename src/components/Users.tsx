import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building, 
  ShieldAlert, 
  Check, 
  X,
  UserCheck
} from 'lucide-react';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';

export const UsersManagement: React.FC = () => {
  const { profile, branches } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('cashier');
  const [formBranchId, setFormBranchId] = useState('b-main');
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    setLoading(true);
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(items);
      setLoading(false);
    }, (err) => console.error(err));

    return () => unsubscribe();
  }, [profile]);

  // Filters matching
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(searchText.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesBranch = branchFilter === 'all' || u.branchId === branchFilter;
    return matchesSearch && matchesRole && matchesBranch;
  });

  const openForm = (u: UserProfile | null = null) => {
    if (u) {
      setIsEdit(true);
      setSelectedUser(u);
      setFormName(u.displayName);
      setFormEmail(u.email);
      setFormRole(u.role);
      setFormBranchId(u.branchId);
      setFormActive(u.active);
    } else {
      setIsEdit(false);
      setSelectedUser(null);
      setFormName('');
      setFormEmail('');
      setFormRole('cashier');
      setFormBranchId(branches[0]?.id || 'b-main');
      setFormActive(true);
    }
    setIsFormOpen(true);
  };

  const saveUserAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      alert('Must complete all basic username fields.');
      return;
    }

    try {
      if (isEdit && selectedUser) {
        const uRef = doc(db, 'users', selectedUser.uid);
        await updateDoc(uRef, {
          displayName: formName,
          role: formRole,
          branchId: formBranchId,
          active: formActive,
          updatedAt: new Date().toISOString()
        });
        alert('User details applied successfully.');
        setIsFormOpen(false);
      } else {
        // Admin creating user record in users collection directly.
        // We generate a custom uid or standard user record mapping.
        // The operators can sign in via that email with default cashier login, or we map of them.
        const customUid = `u-${Date.now().toString().slice(-6)}`;
        const uRef = doc(db, 'users', customUid);
        const newUser: UserProfile = {
          uid: customUid,
          displayName: formName,
          email: formEmail,
          role: formRole,
          branchId: formBranchId,
          active: formActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(uRef, newUser);
        alert('Standard user profile document seeded. They can log in to claim this address.');
        setIsFormOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Operation failed: ${err.message}`);
    }
  };

  const toggleStatus = async (userRecord: UserProfile) => {
    try {
      const uRef = doc(db, 'users', userRecord.uid);
      await updateDoc(uRef, {
        active: !userRecord.active,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(err);
      alert(`Action failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pharmacy Operators Manager</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Provision roles and assign dedicated branches to operating cashier and managerial staff.
          </p>
        </div>

        <button
          onClick={() => openForm(null)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold leading-none flex items-center gap-1.5 transition"
        >
          <Plus className="h-4 w-4" /> Seed Employee profile
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3 dark:bg-slate-900 dark:border-slate-800">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Filter by name or email..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-1.5 text-xs outline-none focus:border-sky-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Corporate Roles</option>
              <option value="admin">Admins Only</option>
              <option value="manager">Managers Only</option>
              <option value="assistant">Assistants Only</option>
              <option value="cashier">Cashiers Only</option>
            </select>
          </div>

          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Assigned Locations</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* OPERATORS TABLE Gird */}
      <div className="bg-white border text-xs md:text-sm border-slate-250 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] dark:bg-slate-950 dark:border-slate-850">
              <tr>
                <th className="p-4">Name & Email</th>
                <th className="p-4">Access Role Title</th>
                <th className="p-4">Assigned physical Node</th>
                <th className="p-4">Account status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-450 text-xs">Loading user listing maps...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 text-xs">No registered staff match this filter criteria.</td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const br = branches.find(b => b.id === u.branchId);
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/65 dark:hover:bg-slate-950/40 transition text-xs">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-white">{u.displayName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{u.email}</div>
                      </td>
                      <td className="p-4 capitalize">
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 font-bold rounded-full text-[10px] dark:bg-indigo-950/40 dark:text-indigo-400">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700 dark:text-slate-350">{br?.name || 'Central Office HQ'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleStatus(u)}
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            u.active 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                              : 'bg-red-50 text-red-700 dark:bg-red-955'
                          }`}
                        >
                          {u.active ? 'Active' : 'Deactivated'}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => openForm(u)}
                          className="p-1 text-sky-600 hover:bg-slate-50 rounded dark:text-sky-400"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTIONS EDIT PROFILE POPUP */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Set Staff Configurations' : 'Seed Operator parameters'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveUserAction} className="my-4 space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. Mercy Chipo"
                  className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Email address *</label>
                <input
                  type="email"
                  required
                  disabled={isEdit}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="operator@email.com"
                  className="w-full rounded border border-slate-200 px-3 py-2 outline-none disabled:bg-slate-105 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ERP Privilege Role</label>
                  <select
                    value={formRole}
                    onChange={(e: any) => setFormRole(e.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold capitalize"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="assistant">Assistant </option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Affiliated Branch Location</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 block text-xs select-none">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded border-slate-200 text-sky-600 focus:ring-sky-500"
                  />
                  Activate Employee account permission immediately
                </label>
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
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold leading-none"
                >
                  Save parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UsersManagement;
