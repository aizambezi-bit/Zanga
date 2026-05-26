import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, TransferRequest, TransferItem } from '../types';
import { 
  ArrowLeftRight, 
  Plus, 
  Clock, 
  Check, 
  X, 
  FileText, 
  Trash2, 
  Building, 
  AlertCircle 
} from 'lucide-react';

export const Transfers: React.FC = () => {
  const { profile, branches, settings } = useAuth();
  
  // Data State
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [branchProducts, setBranchProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Request State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  
  // Temporary row inside request drawer
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  // Approval Modal State
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Transfers based on branch affiliation
  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    const transRef = collection(db, 'transfers');
    let q = transRef as any;

    // A cashier/manager only sees transfers involving their branch (either source or target)
    if (profile.role !== 'admin') {
      // Unfortunately Firestore doesn't support easy OR triggers in standard single parameters.
      // So let's load all transfers and filter in memory, which is highly robust for standard applet loads!
      q = transRef;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransferRequest[];
      if (profile.role !== 'admin') {
        items = items.filter(t => t.sourceBranchId === profile.branchId || t.targetBranchId === profile.branchId);
      }
      setTransfers(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setLoading(false);
    }, (err) => console.error(err));

    return () => unsubscribe();
  }, [profile]);

  // Load standard product stock of current branch to allow checkout transfers
  useEffect(() => {
    if (!profile) return;
    const prodRef = collection(db, 'products');
    const q = query(prodRef, where('branchId', '==', profile.branchId), where('status', '==', 'active'));
    
    getDocs(q).then(snap => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setBranchProducts(items);
      if (items.length > 0) setSelectedProductId(items[0].id);
    });
  }, [profile, isRequestOpen]);

  // Initialize Destination branches
  useEffect(() => {
    if (branches.length > 0 && profile) {
      const other = branches.find(b => b.id !== profile.branchId);
      if (other) setTargetBranchId(other.id);
    }
  }, [branches, profile, isRequestOpen]);

  // Append product to active transfer request item state
  const handleAddItemToTransfer = () => {
    const prod = branchProducts.find(p => p.id === selectedProductId);
    if (!prod) return;

    if (prod.stockQty < selectedQty) {
      alert(`Insufficient Stock! Only ${prod.stockQty} units are currently available.`);
      return;
    }

    // Check duplicate
    const exists = transferItems.find(t => t.productId === prod.id);
    if (exists) {
      alert('medication is already listed in this draft request.');
      return;
    }

    setTransferItems([...transferItems, {
      productId: prod.id,
      name: prod.name,
      SKU: prod.SKU,
      quantity: selectedQty
    }]);
    setSelectedQty(1);
  };

  const removeTemplateItem = (index: number) => {
    setTransferItems(transferItems.filter((_, idx) => idx !== index));
  };

  // Submit transfer request
  const submitTransferRequest = async () => {
    if (!profile || transferItems.length === 0 || !targetBranchId) {
      alert('Please fill out the form entirely and add transfer details.');
      return;
    }

    try {
      const transRef = collection(db, 'transfers');
      const payload: Partial<TransferRequest> = {
        sourceBranchId: profile.branchId,
        sourceBranchName: branches.find(b => b.id === profile.branchId)?.name || 'Source Branch',
        targetBranchId,
        targetBranchName: branches.find(b => b.id === targetBranchId)?.name || 'Destination Branch',
        requestedBy: profile.uid,
        requestedByName: profile.displayName,
        items: transferItems,
        status: 'pending',
        comments: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(transRef, payload);
      setIsRequestOpen(false);
      setTransferItems([]);
      alert('Product dispatch request submitted successfully. Awaiting Manager Approval.');
    } catch (err: any) {
      console.error(err);
      alert(`Request submission failed: ${err.message}`);
    }
  };

  // Process Approval Workflow
  const handleProcessAction = (trans: TransferRequest) => {
    setSelectedTransfer(trans);
    setApprovalComments('');
    setIsApprovalOpen(true);
  };

  const executeApprovalDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedTransfer || !profile) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      const transRef = doc(db, 'transfers', selectedTransfer.id);

      if (decision === 'rejected') {
        const payload = {
          status: 'rejected',
          approvedBy: profile.uid,
          approvedByName: profile.displayName,
          comments: approvalComments || 'Request disapproved.',
          updatedAt: new Date().toISOString()
        };
        batch.update(transRef, payload);
        await batch.commit();
        alert('Stock request marked as REJECTED.');
      } else {
        // Core ERP logic: Approved Transfers!
        // We must reduce qty at source branch and increase qty at target branch
        // Fetch target branch stock to find match SKU records
        const prodCollectionRef = collection(db, 'products');
        const snap = await getDocs(prodCollectionRef);
        const allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];

        // Loop items
        for (const line of selectedTransfer.items) {
          // 1. Reduce from Source branch
          const sourceProductDoc = allProducts.find(p => p.id === line.productId);
          if (sourceProductDoc) {
            const updatedSourceQty = Math.max(0, sourceProductDoc.stockQty - line.quantity);
            const sourceRef = doc(db, 'products', sourceProductDoc.id);
            batch.update(sourceRef, {
              stockQty: updatedSourceQty,
              updatedAt: new Date().toISOString()
            });

            // Write stockMovement log for source
            const mvRef1 = doc(collection(db, 'stockMovements'));
            batch.set(mvRef1, {
              productId: sourceProductDoc.id,
              name: sourceProductDoc.name,
              SKU: sourceProductDoc.SKU,
              branchId: sourceProductDoc.branchId,
              lastQty: sourceProductDoc.stockQty,
              changeQty: -line.quantity,
              finalQty: updatedSourceQty,
              reason: 'Interbranch transfer dispatch approval',
              operator: profile.displayName,
              operatorId: profile.uid,
              createdAt: new Date().toISOString()
            });

            // 2. Increase at Target branch
            const targetProductDoc = allProducts.find(p => p.SKU === sourceProductDoc.SKU && p.branchId === selectedTransfer.targetBranchId);
            if (targetProductDoc) {
              const updatedTargetQty = targetProductDoc.stockQty + line.quantity;
              const targetRef = doc(db, 'products', targetProductDoc.id);
              batch.update(targetRef, {
                stockQty: updatedTargetQty,
                updatedAt: new Date().toISOString()
              });

              // Write stockMovement log for target
              const mvRef2 = doc(collection(db, 'stockMovements'));
              batch.set(mvRef2, {
                productId: targetProductDoc.id,
                name: targetProductDoc.name,
                SKU: targetProductDoc.SKU,
                branchId: targetProductDoc.branchId,
                lastQty: targetProductDoc.stockQty,
                changeQty: line.quantity,
                finalQty: updatedTargetQty,
                reason: 'Interbranch transfer receive approval',
                operator: profile.displayName,
                operatorId: profile.uid,
                createdAt: new Date().toISOString()
              });
            } else {
              // CREATE DUPLICATE SKU RECORD in Target Branch!
              const targetProductId = `${selectedTransfer.targetBranchId}-${sourceProductDoc.SKU}`;
              const targetRef = doc(db, 'products', targetProductId);
              const duplicateRow: Product = {
                id: targetProductId,
                name: sourceProductDoc.name,
                SKU: sourceProductDoc.SKU,
                barcode: sourceProductDoc.barcode,
                category: sourceProductDoc.category,
                unitPrice: sourceProductDoc.unitPrice,
                costPrice: sourceProductDoc.costPrice,
                stockQty: line.quantity,
                reorderLevel: sourceProductDoc.reorderLevel,
                expiryDate: sourceProductDoc.expiryDate,
                batchNumber: sourceProductDoc.batchNumber,
                branchId: selectedTransfer.targetBranchId,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              batch.set(targetRef, duplicateRow);

              // Write movement registry
              const mvRef3 = doc(collection(db, 'stockMovements'));
              batch.set(mvRef3, {
                productId: targetProductId,
                name: duplicateRow.name,
                SKU: duplicateRow.SKU,
                branchId: duplicateRow.branchId,
                lastQty: 0,
                changeQty: line.quantity,
                finalQty: line.quantity,
                reason: 'Interbranch initial receiving duplicate creation',
                operator: profile.displayName,
                operatorId: profile.uid,
                createdAt: new Date().toISOString()
              });
            }
          }
        }

        // Update Transfer request document status
        batch.update(transRef, {
          status: 'approved',
          approvedBy: profile.uid,
          approvedByName: profile.displayName,
          comments: approvalComments || 'Request verified and approved.',
          updatedAt: new Date().toISOString()
        });

        await batch.commit();
        alert('Stock transferred successfully. Inventory profiles balanced.');
      }

      setIsApprovalOpen(false);
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error(err);
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Inter-Branch Stock Transfers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Request inventory dispatch restocks between pharmacy nodes. Requires manager review.
          </p>
        </div>

        {/* Create transfer request trigger */}
        <button
          onClick={() => setIsRequestOpen(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold leading-none flex items-center gap-1.5 transition"
        >
          <Plus className="h-4 w-4" /> Request Stock Dispatch
        </button>
      </div>

      {/* RECENT REQUESTS LISTING TABLE */}
      <div className="bg-white border rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white text-xs md:text-sm">Inter-branch Transports Ledger</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] dark:bg-slate-950 dark:border-slate-850">
              <tr>
                <th className="p-4">Transfer Reference ID</th>
                <th className="p-4">Direction & Dispatch Route</th>
                <th className="p-4">Medicines Included</th>
                <th className="p-4">Issued By</th>
                <th className="p-4">State Status</th>
                <th className="p-4 text-center">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-450 text-xs">
                    Downloading transfer requests...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-xs">
                    No branch transport logs recorded. Click "Request Stock Dispatch" to start one.
                  </td>
                </tr>
              ) : (
                transfers.map((trans) => {
                  const isPending = trans.status === 'pending';
                  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin';
                  
                  // Can the active user resolve this ticket?
                  // Managers can approve if their active branch is either source or target
                  const userCanApprove = isPending && isManagerOrAdmin && 
                    (profile?.role === 'admin' || profile?.branchId === trans.targetBranchId || profile?.branchId === trans.sourceBranchId);

                  return (
                    <tr key={trans.id} className="hover:bg-slate-50/65 dark:hover:bg-slate-950/40 transition">
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {trans.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{trans.sourceBranchName}</span>
                          <span className="text-slate-450 font-mono">→</span>
                          <span className="font-bold text-sky-600 dark:text-sky-400">{trans.targetBranchName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Requested {new Date(trans.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                          {trans.items.map((line, idx) => (
                            <div key={idx}>
                              • {line.name} <span className="font-bold text-slate-800 dark:text-slate-100">x{line.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium">
                        <div>{trans.requestedByName}</div>
                        {trans.approvedBy && (
                          <div className="text-[10px] text-slate-400 mt-1">Resolved: {trans.approvedByName}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          trans.status === 'pending' 
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 animate-pulse' 
                            : (trans.status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400')
                        }`}>
                          {trans.status}
                        </span>
                        {trans.comments && (
                          <div className="text-[10px] text-slate-400 mt-1 italic max-w-[150px] truncate" title={trans.comments}>
                            "{trans.comments}"
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {userCanApprove ? (
                          <button
                            onClick={() => handleProcessAction(trans)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold select-none transition"
                          >
                            Resolve / Sign
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REQUEST MODAL DRAWER */}
      {isRequestOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border dark:bg-slate-900 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">Draft Stock Dispatch Request</h3>
              <button onClick={() => setIsRequestOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 space-y-4">
              
              {/* Target branch selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Target Destination Branch *
                </label>
                <select
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs md:text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium"
                >
                  {branches.filter(b => b.id !== profile?.branchId).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Select the receiving pharmacy warehouse.</p>
              </div>

              {/* Items composer Row */}
              <div className="border p-3 rounded-lg space-y-3 bg-slate-50 dark:bg-slate-955 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Add Medication lines:</h4>
                <div className="grid gap-3 grid-cols-12 items-end">
                  <div className="col-span-7">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Medication</span>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full rounded-xl border bg-white border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    >
                      <option value="">Select medication...</option>
                      {branchProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.stockQty} in stock)</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-xl border bg-white border-slate-200 px-3 py-2 text-xs text-center font-bold outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItemToTransfer}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-lg shadow-sky-600/20 active:scale-[0.98] transition-all"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Draft details lines */}
              <div className="space-y-2 max-h-[140px] overflow-y-auto">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Added dispatch lines:</span>
                {transferItems.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 italic">No drugs queued. Add items above first.</div>
                ) : (
                  transferItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 rounded border bg-white shadow-sm dark:bg-slate-950 dark:border-slate-800">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-250">{item.name}</span>
                        <span className="text-[10px] text-slate-400 block">SKU: {item.SKU}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sky-600 dark:text-sky-450">{item.quantity} units</span>
                        <button onClick={() => removeTemplateItem(idx)} className="text-slate-450 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer trigger */}
            <div className="flex gap-2 justify-end border-t pt-4 dark:border-slate-800">
              <button
                onClick={() => setIsRequestOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={submitTransferRequest}
                disabled={transferItems.length === 0}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold leading-none disabled:opacity-50"
              >
                Submit Operational Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG MODAL 2: RESOLVISATION (APPROVAL/REJECTION) */}
      {isApprovalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">Resolve Dispatch Ticket</h3>
              <button onClick={() => setIsApprovalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg text-xs space-y-1.5 dark:bg-amber-950/20 text-slate-700 dark:text-slate-300">
                <div>Transfer Ticket: <span className="font-bold">{selectedTransfer.id.slice(-8).toUpperCase()}</span></div>
                <div>Source Stock: <span className="font-semibold">{selectedTransfer.sourceBranchName}</span></div>
                <div>Target Restock: <span className="font-bold text-sky-600 dark:text-sky-400">{selectedTransfer.targetBranchName}</span></div>
                <div className="border-t pt-1 border-dashed border-amber-200 mt-1">
                  {selectedTransfer.items.map((it, idx) => (
                    <div key={idx} className="font-mono text-[10px]">• {it.name} (x{it.quantity} units)</div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Approval or Rejection commentary *</label>
                <textarea
                  value={approvalComments}
                  rows={2}
                  required
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Insert authorization notes or rejection grounds..."
                  className="w-full rounded border border-slate-200 p-2.5 text-xs outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsApprovalOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-500"
              >
                Go Back
              </button>
              <button
                onClick={() => executeApprovalDecision('rejected')}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-105 hover:bg-red-200 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold leading-none"
              >
                Disapprove / Reject
              </button>
              <button
                onClick={() => executeApprovalDecision('approved')}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold leading-none"
              >
                Authorize & dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Transfers;
