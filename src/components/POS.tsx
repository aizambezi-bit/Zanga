import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, CartItem, Sale } from '../types';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  Coins, 
  CreditCard, 
  TrendingUp, 
  Smartphone,
  CheckCircle,
  HelpCircle,
  FolderLock,
  Pause,
  Play,
  Printer,
  ChevronRight
} from 'lucide-react';

export const POS: React.FC = () => {
  const { profile, settings, branches } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Transaction settings
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isTaxExempt, setIsTaxExempt] = useState(false);

  // checkout modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money' | 'split'>('cash');
  
  // Split payment amounts
  const [cashSplit, setCashSplit] = useState(0);
  const [cardSplit, setCardSplit] = useState(0);
  const [mobileSplit, setMobileSplit] = useState(0);
  const [mobileReference, setMobileReference] = useState('');
  
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successSale, setSuccessSale] = useState<Sale | null>(null);

  // Holds List
  const [heldCarts, setHeldCarts] = useState<{ id: string; time: string; cart: CartItem[]; originalTotal: number }[]>([]);

  // Load products of the operator's branch
  useEffect(() => {
    if (!profile) return;
    
    const fetchBranchStock = async () => {
      try {
        const colRef = collection(db, 'products');
        const q = query(
          colRef, 
          where('branchId', '==', profile.branchId),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(items);
      } catch (err) {
        console.error('Error fetching stock for POS:', err);
      }
    };

    fetchBranchStock();
    
    // Load local storage held carts
    const cacheKey = `held_carts_${profile.branchId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setHeldCarts(JSON.parse(cached));
    }
  }, [profile]);

  // Categories list
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const queryLower = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(queryLower) || 
                          p.SKU.toLowerCase().includes(queryLower) || 
                          p.barcode === searchQuery;
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) {
      alert('WARNING: This item is currently out of stock!');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const activeQuantity = cart[existingIndex].quantity;
      if (activeQuantity >= product.stockQty) {
        alert(`Cannot add more. Limit of active stock reached: ${product.stockQty} remaining.`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1, discountAmount: 0 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.product.stockQty) {
      alert(`Limit of active stock reached: ${item.product.stockQty} units remaining.`);
      return;
    }

    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Calculations
  const taxRate = settings?.taxRate || 15;
  
  const subtotal = cart.reduce((acc, item) => {
    const itemTotal = (item.product.unitPrice * item.quantity) - (item.discountAmount * item.quantity);
    return acc + itemTotal;
  }, 0);

  const discountValue = subtotal * (discountPercent / 100);
  const taxableBasis = subtotal - discountValue;
  const taxValue = isTaxExempt ? 0 : taxableBasis * (taxRate / 100);
  const grandTotal = taxableBasis + taxValue;

  // Hold / Resume
  const holdActiveCart = () => {
    if (cart.length === 0) return;
    const cacheKey = `held_carts_${profile?.branchId}`;
    const newHold = {
      id: `H-${Date.now().toString().slice(-6)}`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cart,
      originalTotal: grandTotal
    };
    
    const updated = [newHold, ...heldCarts];
    setHeldCarts(updated);
    localStorage.setItem(cacheKey, JSON.stringify(updated));
    setCart([]);
    alert('Cart has been placed on HOLD.');
  };

  const resumeCart = (heldId: string) => {
    const chosen = heldCarts.find(h => h.id === heldId);
    if (!chosen) return;

    if (cart.length > 0 && !confirm('Discarding current cart and restoring held cart?')) {
      return;
    }

    setCart(chosen.cart);
    const updated = heldCarts.filter(h => h.id !== heldId);
    setHeldCarts(updated);
    localStorage.setItem(`held_carts_${profile?.branchId}`, JSON.stringify(updated));
  };

  const deleteHeldCart = (heldId: string) => {
    const updated = heldCarts.filter(h => h.id !== heldId);
    setHeldCarts(updated);
    localStorage.setItem(`held_carts_${profile?.branchId}`, JSON.stringify(updated));
  };

  // Checkout handling
  const triggerCheckout = () => {
    if (cart.length === 0) return;
    // Set default split suggestions
    setCashSplit(Number(grandTotal.toFixed(2)));
    setCardSplit(0);
    setMobileSplit(0);
    setIsCheckoutOpen(true);
  };

  const executeCheckout = async () => {
    if (!profile) return;
    
    // Split payment verification
    if (paymentMethod === 'split') {
      const sum = cashSplit + cardSplit + mobileSplit;
      if (Math.abs(sum - grandTotal) > 0.05) {
        alert(`Split total (${settings?.currency || '$'}${sum.toFixed(2)}) must exactly equal grand total (${settings?.currency || '$'}${grandTotal.toFixed(2)})`);
        return;
      }
    }

    setIsProcessing(true);
    setErrorStatusText(null);

    try {
      const saleId = `SAL-${profile.branchId.toUpperCase().slice(-4)}-${Date.now().toString().slice(-8)}`;
      const batchList = writeBatch(db);

      // Create Sale Document
      const saleRef = doc(collection(db, 'sales'), saleId);
      const invoiceData: Sale = {
        id: saleId,
        saleId,
        branchId: profile.branchId,
        cashierId: profile.uid,
        cashierName: profile.displayName,
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          SKU: item.product.SKU,
          unitPrice: item.product.unitPrice,
          costPrice: item.product.costPrice,
          quantity: item.quantity,
          discountAmount: item.discountAmount,
          total: (item.product.unitPrice - item.discountAmount) * item.quantity
        })),
        subtotal,
        discount: discountValue,
        tax: taxValue,
        total: grandTotal,
        paymentMethod,
        paymentDetails: {
          cashAmount: paymentMethod === 'cash' ? grandTotal : (paymentMethod === 'split' ? cashSplit : 0),
          cardAmount: paymentMethod === 'card' ? grandTotal : (paymentMethod === 'split' ? cardSplit : 0),
          mobileMoneyAmount: paymentMethod === 'mobile_money' ? grandTotal : (paymentMethod === 'split' ? mobileSplit : 0),
          mobileMoneyReference: mobileReference,
          notes: notes
        },
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      batchList.set(saleRef, invoiceData);

      // Deduct active stocks inside batch
      cart.forEach((item) => {
        const prodRef = doc(db, 'products', item.product.id);
        const currentInStore = products.find(p => p.id === item.product.id);
        if (currentInStore) {
          const finalStock = currentInStore.stockQty - item.quantity;
          batchList.update(prodRef, {
            stockQty: Math.max(0, finalStock),
            updatedAt: new Date().toISOString()
          });
        }
      });

      // Insert Sales Revenue record directly onto Accounting Cashbook
      const cashEntryRef = doc(collection(db, 'accounting'), `ledger-pos-${Date.now()}`);
      batchList.set(cashEntryRef, {
        type: 'revenue',
        category: 'Sales Revenue',
        code: '4010', // Standard sales revenue code
        amount: grandTotal,
        description: `POS Checkout txn ref #${saleId}`,
        branchId: profile.branchId,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });

      await batchList.commit();

      // Update in-browser local view states
      setProducts(prev => prev.map(p => {
        const line = cart.find(c => c.product.id === p.id);
        return line ? { ...p, stockQty: Math.max(0, p.stockQty - line.quantity) } : p;
      }));

      setSuccessSale(invoiceData);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorStatusText(err.message || 'Firestore operational write failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const [errorStatusText, setErrorStatusText] = useState<string | null>(null);

  const simulateBarcodeScan = () => {
    // Pick first randomized product barcode in stock
    const itemWithStock = products.find(p => p.stockQty > 0);
    if (itemWithStock) {
      setSearchQuery(itemWithStock.barcode);
    } else {
      alert('Seeded stock fully depleted. Add more inventory first.');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 h-[calc(100vh-120px)]">
      
      {/* LEFT PORTION: SEARCH & PRODUCT SELECTION */}
      <div className="lg:col-span-7 flex flex-col justify-between border border-slate-250 bg-white rounded-xl shadow-sm p-4 dark:bg-slate-900 dark:border-slate-800">
        <div>
          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lookup Name, SKU or Barcode..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm outline-none transition focus:border-sky-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
            
            <button
              onClick={simulateBarcodeScan}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              title="Simulates standard scan trigger"
            >
              📊 Trigger Scan
            </button>
          </div>

          {/* Categories track */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 max-w-full">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-full capitalize whitespace-nowrap ${
                  selectedCategory === cat 
                    ? 'bg-sky-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat === 'all' ? 'All Classes' : cat}
              </button>
            ))}
          </div>

          {/* Catalog grid */}
          <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-3 overflow-y-auto max-h-[350px] lg:max-h-[460px] pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                {products.length === 0 ? 'No products registered for this branch.' : 'No matched medication items.'}
              </div>
            ) : (
              filteredProducts.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="p-3 border border-slate-205 rounded-xl bg-slate-50/50 hover:bg-slate-50 active:scale-98 transition text-left relative flex flex-col justify-between dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900 group"
                >
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-slate-400 block mb-1">{prod.SKU}</span>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{prod.name}</h3>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="font-bold text-sky-600 text-xs md:text-sm dark:text-sky-400">
                      {settings?.currency || '$'}{prod.unitPrice.toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-semibold px-1 rounded ${
                      prod.stockQty <= (prod.reorderLevel || 10) 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {prod.stockQty} left
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* BOTTOM SEGMENT: HELD CARTS (if any) */}
        {heldCarts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5 dark:text-slate-400">
              <Pause className="h-3.5 w-3.5 text-amber-500" />
              Held Queued Bills ({heldCarts.length}):
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {heldCarts.map(hc => (
                <div 
                  key={hc.id} 
                  className="rounded-lg bg-slate-50 border border-slate-250 p-2 text-xs flex items-center gap-2 shrink-0 dark:bg-slate-950 dark:border-slate-850"
                >
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{hc.id}</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">{hc.time} • {settings?.currency || '$'}{hc.originalTotal.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => resumeCart(hc.id)}
                      className="p-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-300"
                      title="Load Draft"
                    >
                      <Play className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => deleteHeldCart(hc.id)}
                      className="p-1 rounded bg-red-105 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PORTION: CARTS SUMMARY & TOTALS */}
      <div className="lg:col-span-5 flex flex-col justify-between border border-slate-200 bg-white rounded-xl shadow-sm p-4 dark:bg-slate-900 dark:border-slate-800">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              🛒 Current Basket
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-300">
              {cart.reduce((t, c) => t + c.quantity, 0)} medications
            </span>
          </div>

          {/* Cart list details */}
          <div className="mt-4 gap-3 space-y-2 overflow-y-auto max-h-[220px] lg:max-h-[320px] pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                Carts basket is empty. Select medications from catalog side.
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.product.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs dark:bg-slate-950 dark:border-slate-800/50"
                >
                  <div className="flex-1 max-w-[170px] md:max-w-[220px]">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.product.name}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {settings?.currency || '$'}{item.product.unitPrice.toFixed(2)} / unit
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-0.5 text-slate-500 hover:bg-slate-100 rounded">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-slate-800 dark:text-slate-105 min-w-[15px] text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-0.5 text-slate-500 hover:bg-slate-100 rounded">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Item Total Price */}
                  <div className="text-right pl-2">
                    <span className="font-bold text-slate-850 dark:text-white">
                      {settings?.currency || '$'}{((item.product.unitPrice - item.discountAmount) * item.quantity).toFixed(2)}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-red-500 ml-2 p-0.5 inline-block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pricing Vouchers & Checkout controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          
          {/* Discount details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-405 mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs outline-none focus:border-sky-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            
            <div className="flex items-center mt-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={isTaxExempt}
                  onChange={(e) => setIsTaxExempt(e.target.checked)}
                  className="rounded border-slate-200 text-sky-600 focus:ring-sky-500"
                />
                Exempt Vat ({taxRate}%)
              </label>
            </div>
          </div>

          {/* Checkout Totals */}
          <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-100 dark:bg-slate-950 dark:border-slate-800/40">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Basket Subtotal</span>
              <span className="font-semibold">{settings?.currency || '$'}{subtotal.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600">
                <span>Group Discount ({discountPercent}%)</span>
                <span>-{settings?.currency || '$'}{discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500 font-sans">
              <span>Vat Surcharges ({isTaxExempt ? 'Exempt' : `${taxRate}%`})</span>
              <span className="font-semibold">{settings?.currency || '$'}{taxValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-800 dark:text-white">Payable Grand Total</span>
              <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">
                {settings?.currency || '$'}{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={holdActiveCart}
              disabled={cart.length === 0}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
            >
              <Pause className="h-3.5 w-3.5" />
              Hold Ticket
            </button>
            <button
              onClick={triggerCheckout}
              disabled={cart.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow"
            >
              <CoinAndPayIcon method={paymentMethod} />
              Finalize Checkout
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: CHECKOUT MODE & BILL DISPATCH */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">POS Transaction Checkout</h3>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorStatusText && (
              <div className="mt-4 p-3 bg-red-55 rounded text-red-650 text-xs font-semibold">
                ⚠️ write Error: {errorStatusText}
              </div>
            )}

            <div className="my-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-sky-50 dark:bg-sky-950/40 p-3">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Amount Due:</span>
                <span className="text-xl font-extrabold text-sky-600 dark:text-sky-400">
                  {settings?.currency || '$'}{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Settlement Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'Cash', icon: Coins },
                    { id: 'card', label: 'Credit Card', icon: CreditCard },
                    { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
                    { id: 'split', label: 'Split Pay', icon: TrendingUp }
                  ].map(method => {
                    const MethodIcon = method.icon;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                          paymentMethod === method.id 
                            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' 
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                        }`}
                      >
                        <MethodIcon className="h-5 w-5" />
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Inputs according to selections */}
              {paymentMethod === 'mobile_money' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Mobile Money Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    required
                    value={mobileReference}
                    onChange={(e) => setMobileReference(e.target.value)}
                    placeholder="e.g. TXN94104271B"
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Logs Airtel Money, MTN Money, or Zamtel reference</p>
                </div>
              )}

              {paymentMethod === 'split' && (
                <div className="bg-slate-55 p-3 rounded-lg border border-slate-200 space-y-3 dark:bg-slate-950 dark:border-slate-850">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Custom Split Values:</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400">Cash Amount</span>
                      <input
                        type="number"
                        value={cashSplit}
                        onChange={(e) => setCashSplit(Number(e.target.value))}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400">Card Amount</span>
                      <input
                        type="number"
                        value={cardSplit}
                        onChange={(e) => setCardSplit(Number(e.target.value))}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400">Mobile Amt</span>
                      <input
                        type="number"
                        value={mobileSplit}
                        onChange={(e) => setMobileSplit(Number(e.target.value))}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold mt-2">
                    <span className="text-slate-500">Total Entered:</span>
                    <span className={Math.abs((cashSplit + cardSplit + mobileSplit) - grandTotal) < 0.05 ? 'text-emerald-600' : 'text-red-500'}>
                      {settings?.currency || '$'}{(cashSplit + cardSplit + mobileSplit).toFixed(2)} / {settings?.currency || '$'}{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Memo Notes (Optional)</span>
                <textarea
                  value={notes}
                  rows={2}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private memo tags, prescription codes, etc..."
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            {/* Footer triggers */}
            <div className="flex gap-3 justify-end border-t pt-4 dark:border-slate-800">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-500"
              >
                Go Back
              </button>
              <button
                onClick={executeCheckout}
                disabled={isProcessing}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Complete & Deduct Stock'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL: LAUNCH RECEIPT & INVOICE PRINTERS */}
      {successSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-150 dark:bg-slate-900 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="text-center py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-105 text-emerald-600 text-2xl dark:bg-emerald-950">
                ✓
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-3">Transaction Success!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sale record registered as {successSale.saleId}. stocks updated.</p>
            </div>

            {/* Layout simulation: Choose layout size */}
            <div className="my-4 border rounded p-4 bg-slate-50 dark:bg-slate-950 dark:border-slate-850">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Print Templates Available:</span>
                <span className="text-[10px] bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded-full uppercase font-bold">Standard PDF</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => triggerPrint('receipt')}
                  className="p-3 bg-white hover:bg-slate-100 rounded-lg border flex items-center gap-2 justify-center text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 transition"
                >
                  <Printer className="h-4 w-4 text-emerald-500" />
                  Thermal Receipt (80mm)
                </button>
                <button
                  onClick={() => triggerPrint('invoice')}
                  className="p-3 bg-white hover:bg-slate-100 rounded-lg border flex items-center gap-2 justify-center text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 transition"
                >
                  <Printer className="h-4 w-4 text-sky-500" />
                  Format Letter Invoice
                </button>
              </div>

              {/* Printable Layout Pre-Render frame directly in modal for user visibility */}
              <div id="printable-pos-region" className="border max-h-[220px] overflow-y-auto bg-white p-3 rounded text-[10px] font-mono leading-tight shadow-inner dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
                <div className="text-center font-bold">
                  <div>*** {settings?.pharmacyName?.toUpperCase() || 'ZAMBEZI PHARMACY'} ***</div>
                  <div className="text-[8px] font-normal mt-0.5">central independent checkout system</div>
                  <div>SALE REF: {successSale.id}</div>
                  <div>DATE: {new Date(successSale.createdAt).toLocaleString()}</div>
                  <div>CASHIER: {successSale.cashierName}</div>
                </div>
                <div className="border-t border-dashed my-2" />
                <div className="space-y-1">
                  {successSale.items.map(i => (
                    <div key={i.productId} className="flex justify-between">
                      <span>{i.name} x{i.quantity}</span>
                      <span>{settings?.currency || '$'}{i.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed my-2" />
                <div className="space-y-1 text-right">
                  <div>Subtotal: {settings?.currency || '$'}{successSale.subtotal.toFixed(2)}</div>
                  {successSale.discount > 0 && <div>Discount: -{settings?.currency || '$'}{successSale.discount.toFixed(2)}</div>}
                  <div>Vat: {settings?.currency || '$'}{successSale.tax.toFixed(2)}</div>
                  <div className="font-bold">Grand Total: {settings?.currency || '$'}{successSale.total.toFixed(2)}</div>
                </div>
                <div className="text-center mt-3 border-t border-dashed pt-2">
                  {settings?.receiptFooter || 'Thank you for shopping!'}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4 dark:border-slate-850">
              <button
                onClick={() => setSuccessSale(null)}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition w-full"
              >
                Open Next Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-icons loader
const CoinAndPayIcon: React.FC<{ method: string }> = ({ method }) => {
  if (method === 'cash') return <Coins className="h-4 w-4 mr-0.5" />;
  if (method === 'card') return <CreditCard className="h-4 w-4 mr-0.5" />;
  return <Smartphone className="h-4 w-4 mr-0.5" />;
};

const triggerPrint = (type: 'receipt' | 'invoice') => {
  // Use professional browser print-ready layouts
  const element = document.getElementById('printable-pos-region');
  if (!element) return;
  const printContent = element.innerHTML;
  const originalContent = document.body.innerHTML;
  
  // Quick simulated print window for smooth developer layout check
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Pharmacy ${type === 'receipt' ? 'Receipt' : 'Invoice'}</title>
          <style>
            body { font-family: monospace; padding: 20px; width: ${type === 'receipt' ? '80mm' : '210mm'}; margin: 0 auto; line-height: 1.4; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .dashed-line { border-top: 1px dashed #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
            .text-right { text-align: right; }
            .mt-4 { margin-top: 15px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    alert('Browser pop-up blocker is holding print window active. Allow pop-ups or use normal printing.');
  }
};
