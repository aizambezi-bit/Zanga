import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Branch } from '../types';
import { 
  Building2, 
  MapPin, 
  PhoneCall, 
  Plus, 
  Edit, 
  Check, 
  X,
  BadgeAlert,
  ArrowUpRight
} from 'lucide-react';

export const BranchesManagement: React.FC = () => {
  const { profile, branches } = useAuth();
  
  // State
  const [loading, setLoading] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form parameters
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formActive, setFormActive] = useState(true);

  const openForm = (br: Branch | null = null) => {
    if (br) {
      setEditingBranch(br);
      setFormName(br.name);
      setFormCode(br.code);
      setFormLocation(br.address);
      setFormPhone(br.phone);
      setFormActive(br.status === 'active');
    } else {
      setEditingBranch(null);
      setFormName('');
      setFormCode('');
      setFormLocation('');
      setFormPhone('');
      setFormActive(true);
    }
    setIsFormOpen(true);
  };

  const saveBranchAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode || !formLocation) {
      alert('Fill in all descriptive parameters.');
      return;
    }

    try {
      const generatedId = editingBranch ? editingBranch.id : `b-${formCode.toLowerCase().trim()}`;
      const docRef = doc(db, 'branches', generatedId);

      const payload: Partial<Branch> = {
        name: formName,
        code: formCode.toUpperCase().trim(),
        address: formLocation,
        phone: formPhone,
        status: formActive ? 'active' : 'inactive',
        updatedAt: new Date().toISOString()
      };

      if (!editingBranch) {
        payload.id = generatedId;
        payload.createdAt = new Date().toISOString();
        await setDoc(docRef, payload as Branch);
        alert('Physical branch registered successfully.');
      } else {
        await updateDoc(docRef, payload);
        alert('Branch profile updated.');
      }

      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Save branch failed: ${err.message}`);
    }
  };

  const toggleBranchActive = async (br: Branch) => {
    try {
      const docRef = doc(db, 'branches', br.id);
      await updateDoc(docRef, {
        status: br.status === 'active' ? 'inactive' : 'active',
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="p-12 text-center bg-white rounded-xl border max-w-md mx-auto space-y-4">
        <BadgeAlert className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-md font-bold text-slate-800 dark:text-white">Branch Configuration Access Enforced</h2>
        <p className="text-xs text-slate-500">Only global administrators may add or deactivate primary retail branches.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Title Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pharmacy Branches directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Provision dispensary locations, tracking codes, addresses, and physical communication parameters.
          </p>
        </div>

        <button
          onClick={() => openForm(null)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold leading-none flex items-center gap-1.5 transition"
        >
          <Plus className="h-4 w-4" /> Register New Branch
        </button>
      </div>

      {/* BRANCH BENTO GRID CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map(br => {
          return (
            <div key={br.id} className="relative bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between p-5 hover:shadow transition dark:bg-slate-900 dark:border-slate-800">
              
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm md:text-md dark:text-white">{br.name}</h3>
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-500">
                      Code: {br.code}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleBranchActive(br)}
                    className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold select-none ${
                      br.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-955'
                    }`}
                  >
                    {br.status === 'active' ? 'Operational' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-405">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-450" />
                    <span>{br.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PhoneCall className="h-4 w-4 text-slate-450" />
                    <span>{br.phone || 'No phone recorded'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3.5 mt-5 flex justify-end gap-1.5 dark:border-slate-800">
                <button
                  onClick={() => openForm(br)}
                  className="px-2.5 py-1 text-sky-600 hover:bg-slate-50 border border-slate-100 font-semibold rounded text-[11px] flex items-center gap-1 transition dark:border-slate-800 dark:text-sky-400"
                >
                  <Edit className="h-3.5 w-3.5" /> Modify profile
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* FORM WINDOW */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">
                {editingBranch ? 'Edit Branch details' : 'Register New Pharmacy Branch'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveBranchAction} className="my-4 space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Harare Central Plaza"
                  className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Branch Code (3 letter) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingBranch}
                    maxLength={5}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="HRE"
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none font-mono disabled:bg-slate-105 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Store Phone No</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+263 77 123 456"
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Physical AddressLocation *</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. 1st Avenue mall, Suite 10"
                  className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 block text-xs select-none">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded border-slate-200 text-sky-600 focus:ring-sky-500"
                  />
                  Mark as active operational dispensary
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
                  Save Branch profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BranchesManagement;
