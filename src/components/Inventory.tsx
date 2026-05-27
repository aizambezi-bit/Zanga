import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Filter, 
  AlertTriangle, 
  Calendar, 
  Check, 
  X, 
  ChevronRight, 
  FolderMinus, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { profile, branches, settings } = useAuth();
  
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');

  // Search/Filters
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // all, low, normal, depleted

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formSKU, setFormSKU] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnitPrice, setFormUnitPrice] = useState(0);
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formStockQty, setFormStockQty] = useState(0);
  const [formReorderLevel, setFormReorderLevel] = useState(10);
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  // Stock Adjustment manual popup
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQtyChange, setAdjustQtyChange] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Count Audit');

  // Load products based on permissions
  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    const prodRef = collection(db, 'products');
    let q = prodRef as any;

    if (profile.role !== 'admin') {
      q = query(prodRef, where('branchId', '==', profile.branchId));
    } else if (selectedBranchFilter !== 'all') {
      q = query(prodRef, where('branchId', '==', selectedBranchFilter));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
      setLoading(false);
    }, (err) => console.error(err));

    return () => unsubscribe();
  }, [profile, selectedBranchFilter]);

  // Handle setting default branch in form
  useEffect(() => {
    if (profile) {
      setFormBranchId(profile.role === 'admin' ? (branches[0]?.id || '') : profile.branchId);
    }
  }, [profile, branches, isFormOpen]);

  // Categories list
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Filtered Products
  const lowStockThreshold = settings?.lowStockThreshold || 10;
  
  const filteredProducts = products.filter(p => {
    const nameMatches = p.name.toLowerCase().includes(searchText.toLowerCase()) || 
                        p.SKU.toLowerCase().includes(searchText.toLowerCase()) || 
                        p.barcode.includes(searchText);
    const catMatches = categoryFilter === 'all' || p.category === categoryFilter;
    
    let statusMatches = true;
    if (stockStatusFilter === 'low') {
      statusMatches = p.stockQty <= (p.reorderLevel || lowStockThreshold) && p.stockQty > 0;
    } else if (stockStatusFilter === 'depleted') {
      statusMatches = p.stockQty <= 0;
    } else if (stockStatusFilter === 'normal') {
      statusMatches = p.stockQty > (p.reorderLevel || lowStockThreshold);
    }

    return nameMatches && catMatches && statusMatches;
  });

  // Open Form for Adding/Editing
  const openForm = (prod: Product | null = null) => {
    if (prod) {
      setEditingProduct(prod);
      setFormName(prod.name);
      setFormSKU(prod.SKU);
      setFormBarcode(prod.barcode);
      setFormCategory(prod.category);
      setFormUnitPrice(prod.unitPrice);
      setFormCostPrice(prod.costPrice);
      setFormStockQty(prod.stockQty);
      setFormReorderLevel(prod.reorderLevel);
      setFormExpiryDate(prod.expiryDate);
      setFormBatchNo(prod.batchNumber);
      setFormBranchId(prod.branchId);
      setFormStatus(prod.status);
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormSKU('');
      setFormBarcode('');
      setFormCategory('');
      setFormUnitPrice(0);
      setFormCostPrice(0);
      setFormStockQty(0);
      setFormReorderLevel(settings?.lowStockThreshold || 10);
      setFormExpiryDate('');
      setFormBatchNo('');
      setFormBranchId(profile?.role === 'admin' ? 'b-main' : profile?.branchId || '');
      setFormStatus('active');
    }
    setIsFormOpen(true);
  };

  // Submit Product Form
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSKU || !formBarcode || !formCategory || !formBranchId) {
      alert('Fill in all required product descriptors.');
      return;
    }

    try {
      const id = editingProduct ? editingProduct.id : `${formBranchId}-${formSKU}`;
      const prodRef = doc(db, 'products', id);
      
      const payload: Partial<Product> = {
        name: formName,
        SKU: formSKU,
        barcode: formBarcode,
        category: formCategory,
        unitPrice: Number(formUnitPrice),
        costPrice: Number(formCostPrice),
        stockQty: Number(formStockQty),
        reorderLevel: Number(formReorderLevel),
        expiryDate: formExpiryDate,
        batchNumber: formBatchNo,
        branchId: formBranchId,
        status: formStatus,
        updatedAt: new Date().toISOString()
      };

      if (!editingProduct) {
        payload.id = id;
        payload.createdAt = new Date().toISOString();
        await setDoc(prodRef, payload as Product);
      } else {
        await updateDoc(prodRef, payload);
      }

      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error(err);
      alert(`Permission Denied or Error: ${err.message}`);
    }
  };

  // Adjust stock levels manually
  const triggerAdjustment = (prod: Product) => {
    setAdjustProduct(prod);
    setAdjustQtyChange(0);
    setAdjustReason('Physical Variance Audit');
    setIsAdjustOpen(true);
  };

  const executeAdjustment = async () => {
    if (!adjustProduct) return;
    const finalQty = adjustProduct.stockQty + adjustQtyChange;
    
    if (finalQty < 0) {
      alert('Resulting stock cannot fall below 0 units.');
      return;
    }

    try {
      const prodRef = doc(db, 'products', adjustProduct.id);
      
      // Update inventory product
      await updateDoc(prodRef, {
        stockQty: finalQty,
        updatedAt: new Date().toISOString()
      });

      // Write adjustment history movement log
      const movementRef = collection(db, 'stockMovements');
      await addDoc(movementRef, {
        productId: adjustProduct.id,
        name: adjustProduct.name,
        SKU: adjustProduct.SKU,
        branchId: adjustProduct.branchId,
        lastQty: adjustProduct.stockQty,
        changeQty: adjustQtyChange,
        finalQty: finalQty,
        reason: adjustReason,
        operator: profile?.displayName || 'Cashier',
        operatorId: profile?.uid || 'u-adjust',
        createdAt: new Date().toISOString()
      });

      setIsAdjustOpen(false);
      setAdjustProduct(null);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to log adjustment adjustments: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top action row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Medicines Inventory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administers batch expiry dates, reorder levels and stock allocations per branch.
          </p>
        </div>

        {profile?.role !== 'assistant' && (
          <button
            onClick={() => openForm(null)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-2xl text-xs font-bold leading-none flex items-center gap-1 transition shadow-lg shadow-sky-600/20"
          >
            <Plus className="h-4 w-4" /> Add Product Batch
          </button>
        )}
      </div>

      {/* SEARCH PANEL row */}
      <div className="bg-white border dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 dark:bg-slate-900 bento-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* text lookup */}
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search Name or SKU..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Type Category filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Category Classes</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Level levels */}
          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Levels Status</option>
              <option value="low">Low Stock Alerts Only</option>
              <option value="depleted">Depleted (Out of Stock)</option>
              <option value="normal">Healthy Stock Levels</option>
            </select>
          </div>

          {/* Admin Branch filters */}
          {profile?.role === 'admin' ? (
            <div>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All Store Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-500 gap-1 rounded-xl bg-slate-100 p-2 dark:bg-slate-950 dark:text-slate-400">
              📍 Locked to assigned branch.
            </div>
          )}
        </div>
      </div>

      {/* MAIN DATA TABLE LIST */}
      <div className="bg-white border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm dark:bg-slate-900 overflow-hidden bento-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px] dark:bg-slate-950">
              <tr>
                <th className="p-4">SKU & Product description</th>
                <th className="p-4">Category</th>
                <th className="p-4">Batch / Expiry</th>
                <th className="p-4">In-Stock Qty</th>
                <th className="p-4">Purchase / Retail</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    Fetching inventory data from servers...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-450 text-xs">
                    No drugs match the selected filter presets.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stockQty <= (p.reorderLevel || lowStockThreshold);
                  const isNearExp = new Date(p.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

                  return (
                    <tr 
                      key={p.id} 
                      className="even:bg-slate-50/40 dark:even:bg-slate-800/10 hover:bg-slate-100/55 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>SKU: {p.SKU}</span> • <span>Barcode: {p.barcode}</span>
                          {profile?.role === 'admin' && (
                            <span className="bg-slate-200 text-slate-700 px-1 rounded-sm transform scale-90">
                              {branches.find(b => b.id === p.branchId)?.code || p.branchId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-full text-[10px] dark:bg-slate-800 dark:text-slate-300">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono">
                        <div>Batch: <span className="font-semibold">{p.batchNumber}</span></div>
                        <div className="mt-0.5">
                          <span className={`${
                            isNearExp 
                              ? 'text-red-500 font-bold' 
                              : 'text-slate-450 dark:text-slate-400'
                          }`}>
                            Exp: {p.expiryDate}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs md:text-sm ${
                            p.stockQty <= 0 ? 'text-red-600 dark:text-red-400' : (isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white')
                          }`}>
                            {p.stockQty} units
                          </span>
                          {isLow && (
                            <span className="p-0.5 bg-amber-50 rounded text-amber-500 animate-pulse" title="Below threshold reorder!">
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium">
                        <div>Cost: {settings?.currency || 'K'}{p.costPrice.toFixed(2)}</div>
                        <div className="mt-0.5 font-bold text-sky-600 dark:text-sky-400">Retail: {settings?.currency || 'K'}{p.unitPrice.toFixed(2)}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => triggerAdjustment(p)}
                            className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[11px] font-semibold dark:bg-amber-950/20 dark:text-amber-400 transition"
                            title="Adjust quantity"
                          >
                            Adjust
                          </button>
                          
                          {profile?.role !== 'assistant' && (
                            <button
                              onClick={() => openForm(p)}
                              className="p-1 rounded-lg text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                              title="Edit item information"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL: ADD / EDIT DIALOG */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">
                {editingProduct ? 'Modify Product Batch' : 'Register New Drug Batch'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveProduct} className="my-4 space-y-4 text-xs md:text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Product Description Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Paracetamol tablets b.p 500mg"
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Product SKU *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formSKU}
                    onChange={(e) => setFormSKU(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="PCM-500-TAB"
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">UPC / Barcode *</label>
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="6001234567891"
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Therapeutic Class Category *</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Analgesics"
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Active Batch / Lot No</label>
                  <input
                    type="text"
                    value={formBatchNo}
                    onChange={(e) => setFormBatchNo(e.target.value)}
                    placeholder="e.g. BATCH124"
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Purchase Cost Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Selling Retail Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Opening Stock Qty *</label>
                  <input
                    type="number"
                    required
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Low Reorder Alert Level</label>
                  <input
                    type="number"
                    value={formReorderLevel}
                    onChange={(e) => setFormReorderLevel(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Expiration Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {profile?.role === 'admin' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Allocated Pharmacy Branch *</label>
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
                ) : (
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 mb-1">Allocated Branch</span>
                    <span className="text-xs font-bold bg-slate-100 p-2 block rounded dark:bg-slate-800 dark:text-slate-300">
                      {branches.find(b => b.id === formBranchId)?.name || formBranchId}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Selling Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full rounded border border-slate-200 px-3 py-2 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="active">Active (On Shelf)</option>
                    <option value="inactive">Inactive (Discontinued)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4 dark:border-slate-800 mt-6">
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
                  Save Stock Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST QUANTITY DIALOG MODAL */}
      {isAdjustOpen && adjustProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">Log Stock Adjustment</h3>
              <button onClick={() => setIsAdjustOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900 rounded-xl space-y-1">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-400">{adjustProduct.name}</h4>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Active Stock: <span className="font-bold">{adjustProduct.stockQty} unit</span></span>
                  <span>Batch: <span className="font-bold">{adjustProduct.batchNumber}</span></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Stock Adjustment (+ / -)</label>
                  <input
                    type="number"
                    value={adjustQtyChange}
                    onChange={(e) => setAdjustQtyChange(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-center font-bold outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Value can be positive (stock-in) or negative (breakage deduction)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Reason/Classification</label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Count Audit">Count Inventory Audit</option>
                    <option value="Damaged Stock">Damaged Medication</option>
                    <option value="Spoiled Meds">Expiry Disposal</option>
                    <option value="Inbound Delivery">Inbound Dispatch Add</option>
                    <option value="Other discrepancy">Other discrepancy</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs border bg-slate-50 p-2.5 rounded dark:bg-slate-950 dark:border-slate-800">
                <span className="text-slate-450">Calculated Final:</span>
                <span className="font-extrabold text-indigo-600 flex items-center gap-1.5 dark:text-indigo-400">
                  {adjustProduct.stockQty} <ArrowRight className="h-3.5 w-3.5" /> {(adjustProduct.stockQty + adjustQtyChange)} units
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4 dark:border-slate-800">
              <button
                onClick={() => setIsAdjustOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-500"
              >
                Go Back
              </button>
              <button
                onClick={executeAdjustment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold leading-none"
              >
                Log Adjustment Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Inventory;
