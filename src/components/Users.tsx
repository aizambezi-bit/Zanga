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
  Building, 
  Check, 
  X,
  Key,
  Copy,
  Clock,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const { profile, branches } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Seed / Edit Employee Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('cashier');
  const [formBranchId, setFormBranchId] = useState('b-main');
  const [formActive, setFormActive] = useState(true);

  // Invite Creator Form
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('cashier');
  const [inviteBranchId, setInviteBranchId] = useState('b-main');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    setLoading(true);

    // Users snapshot listener
    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(items);
      setLoading(false);
    }, (err) => console.error('Error fetching users:', err));

    // Invites snapshot listener
    const invitesRef = collection(db, 'invites');
    const unsubscribeInvites = onSnapshot(invitesRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvites(items);
    }, (err) => console.error('Error fetching invites:', err));

    return () => {
      unsubscribeUsers();
      unsubscribeInvites();
    };
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
        alert('Standard user profile document seeded successfully.');
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

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteRef = doc(db, 'invites', code);
      await setDoc(inviteRef, {
        active: true,
        role: inviteRole,
        branchId: inviteBranchId,
        createdBy: profile?.uid,
        createdAt: new Date().toISOString()
      });
      setIsInviteFormOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Could not create invitation code: ${err.message}`);
    }
  };

  const handleToggleInviteStatus = async (id: string, active: boolean) => {
    try {
      const inviteRef = doc(db, 'invites', id);
      await updateDoc(inviteRef, {
        active: !active
      });
    } catch (err: any) {
      console.error(err);
      alert(`Failed to change invite status: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(text);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" /> Pharmacy Staff Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Provision user roles, assign physical branches, and generate secure invite codes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setInviteBranchId(branches[0]?.id || 'b-main');
              setIsInviteFormOpen(true);
            }}
            className="px-4 py-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:bg-emerald-600 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition"
          >
            <Key className="h-4 w-4" /> Create Invite Code
          </button>

          <button
            onClick={() => openForm(null)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-white rounded-lg text-xs font-bold leading-none flex items-center gap-1.5 transition"
          >
            <Plus className="h-4 w-4" /> Seed Employee Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: ACTIVE MANAGED USERS */}
        <div className="lg:col-span-8 space-y-6">
          
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
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-1.5 text-xs outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold"
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
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold"
                >
                  <option value="all">All Assigned Locations</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* OPERATORS TABLE */}
          <div className="bg-white border text-xs md:text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] dark:bg-slate-950 dark:border-slate-850">
                  <tr>
                    <th className="p-4">Name & Email</th>
                    <th className="p-4">Access Role</th>
                    <th className="p-4">Assigned Branch Node</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">Loading user listing maps...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-450 text-xs">No registered staff match this filter criteria.</td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const br = branches.find(b => b.id === u.branchId);
                      return (
                        <tr key={u.uid} className="hover:bg-slate-550/5 dark:hover:bg-slate-950/40 transition text-xs">
                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-white">{u.displayName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{u.email}</div>
                          </td>
                          <td className="p-4 capitalize">
                            <span className="px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 font-bold rounded-full text-[10px]">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Building className="h-3.5 w-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-705 dark:text-slate-350">{br?.name || 'Central Office HQ'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => toggleStatus(u)}
                              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                u.active 
                                  ? 'bg-emerald-500/10 border border-emerald-500/10 text-emerald-400' 
                                  : 'bg-red-500/10 border border-red-500/10 text-red-400'
                              }`}
                            >
                              {u.active ? 'Active' : 'Pending Gate'}
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => openForm(u)}
                              className="p-1 text-slate-400 hover:text-white rounded"
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

        </div>

        {/* RIGHT COLUMN: REUSABLE INVITATION CODES MANAGER */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                Staff Invitations
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Send generated codes to coworkers so they can link directly under your Pharmacy instance during onboarding.
              </p>
            </div>

            <div className="space-y-3">
              {invites.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-800 text-center rounded-xl text-xs text-slate-500">
                  No active invitations yet. Use top button to create codes.
                </div>
              ) : (
                invites.map(invite => {
                  const correlatedBranch = branches.find(b => b.id === invite.branchId);
                  const isCopied = copiedCodeId === invite.id;
                  
                  return (
                    <div 
                      key={invite.id} 
                      className={`p-3 border rounded-xl space-y-2 transition-all ${
                        invite.active 
                          ? 'bg-slate-950/40 border-emerald-500/10 hover:border-emerald-500/20' 
                          : 'bg-slate-950/10 border-slate-850 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs select-all text-white bg-slate-950 px-2 py-1 rounded border border-slate-800 leading-none">
                          {invite.id}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => copyToClipboard(invite.id)}
                            className="p-1 text-slate-400 hover:text-white transition"
                            title="Copy code to clipboards"
                          >
                            {isCopied ? (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded border border-emerald-500/10">Copied!</span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleToggleInviteStatus(invite.id, invite.active)}
                            className={`p-0.5 rounded text-[9px] font-black uppercase px-2 py-0.5 ${
                              invite.active
                                ? 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 hover:bg-slate-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {invite.active ? 'Recall' : 'Activate'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 text-[10px] text-slate-400 pt-1 border-t border-slate-950/40 font-semibold gap-1">
                        <div className="capitalize flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" /> {invite.role}
                        </div>
                        <div className="truncate flex items-center gap-1">
                          <Building className="w-3 h-3 text-indigo-400 shrink-0" /> {correlatedBranch?.name || invite.branchId}
                        </div>
                        {invite.claimedBy && (
                          <div className="col-span-2 text-[9px] text-violet-400">
                            Claimed UID: {invite.claimedBy.slice(-5)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* INVITATION DRAWER MODAL */}
      {isInviteFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                <Key className="w-4 h-4 text-emerald-400" /> Generate Invite
              </h3>
              <button onClick={() => setIsInviteFormOpen(false)} className="text-slate-400 hover:text-white font-bold">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateInvite} className="space-y-4 text-xs font-semibold text-slate-350">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                  Access Privilege Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none capitalize"
                >
                  <option value="cashier">Cashier (Standard Operator)</option>
                  <option value="assistant">Assistant (Inventory Staff)</option>
                  <option value="manager">Manager (Branch Administrator)</option>
                  <option value="admin">Admin (Joint Controller)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                  Assigned Branch Node
                </label>
                <select
                  value={inviteBranchId}
                  onChange={(e) => setInviteBranchId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteFormOpen(false)}
                  className="flex-1 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 text-xs tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-black uppercase tracking-wider"
                >
                  Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEED/EDIT PROFILE POPUP */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Privilege Role</label>
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Physical branch</label>
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
                <label className="flex items-center gap-1.5 block text-xs select-none cursor-pointer">
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
                  className="px-5 py-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold rounded-lg text-xs font-bold leading-none"
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
