import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Branch, UserProfile, Sale, AccountingEntry, TransferRequest, PharmacySettings } from '../types';

export async function seedCompleteSystem() {
  try {
    const batch = writeBatch(db);

    console.log("Initializing Pharmacy ERP database seeding sequence...");

    // 1. SEED DEFAULT BRANCHES
    const branchesRef = collection(db, 'branches');
    const seededBranches: Branch[] = [
      {
        id: 'b-main',
        name: 'Central Plaza (HQ)',
        code: 'MAIN',
        address: '456 Independence Avenue, Lusaka',
        phone: '+260 970 001122',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'b-north',
        name: 'Northern Gate Clinic',
        code: 'NGATE',
        address: '12 Medical Way, Kitwe',
        phone: '+260 960 334455',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'b-east',
        name: 'Eastern Gateway Depot',
        code: 'EGATE',
        address: '78 Border Road, Chipata',
        phone: '+260 950 556677',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    seededBranches.forEach(branch => {
      const ref = doc(branchesRef, branch.id);
      batch.set(ref, branch);
    });

    // 2. SEED OPERATING EMPLOYEES / USERS (Removed demo accounts as per request)
    const usersRef = collection(db, 'users');
    const seededStaffs: UserProfile[] = [];

    seededStaffs.forEach(staff => {
      const ref = doc(usersRef, staff.uid);
      batch.set(ref, staff);
    });

    // 3. SEED EXPERT PHARMACY MEDICATIONS (across active branches to enable testing on branch filter)
    const productsRef = collection(db, 'products');
    const medicineTemplates = [
      {
        name: 'Amoxicillin 500mg Unit',
        SKU: 'AMX-500-01',
        barcode: '6001234567891',
        category: 'Antibiotics',
        unitPrice: 15.00,
        costPrice: 6.50,
        reorderLevel: 25,
        expiryDate: '2026-12-15',
        batchNumber: 'AMX26L12',
      },
      {
        name: 'Paracetamol 500mg Box',
        SKU: 'PARA-500-02',
        barcode: '6001234567892',
        category: 'Analgesics / Pain',
        unitPrice: 2.50,
        costPrice: 0.80,
        reorderLevel: 50,
        expiryDate: '2027-04-10',
        batchNumber: 'PCM27K04',
      },
      {
        name: 'Metformin 850mg (Tab)',
        SKU: 'MET-850-03',
        barcode: '6001234567893',
        category: 'Anti-Diabetic',
        unitPrice: 12.00,
        costPrice: 4.20,
        reorderLevel: 20,
        expiryDate: '2026-09-30',
        batchNumber: 'MET26J09',
      },
      {
        name: 'Atorvastatin 20mg Pack',
        SKU: 'ATO-20-04',
        barcode: '6001234567894',
        category: 'Cardiovascular',
        unitPrice: 24.50,
        costPrice: 9.80,
        reorderLevel: 15,
        expiryDate: '2026-07-25', 
        batchNumber: 'ATO26G07',
      },
      {
        name: 'Vitamin C 1000mg Chew',
        SKU: 'VITC-1000-05',
        barcode: '6001234567895',
        category: 'Supplements',
        unitPrice: 8.90,
        costPrice: 3.50,
        reorderLevel: 30,
        expiryDate: '2027-01-01',
        batchNumber: 'VTC27A01',
      },
      {
        name: 'Ibuprofen 400mg Cap',
        SKU: 'IBU-400-07',
        barcode: '6001234567897',
        category: 'Analgesics / Pain',
        unitPrice: 4.50,
        costPrice: 1.50,
        reorderLevel: 40,
        expiryDate: '2026-08-14',
        batchNumber: 'IBU26H08',
      },
      {
        name: 'Omeprazole 20mg Tab',
        SKU: 'OME-20-08',
        barcode: '6001234567898',
        category: 'Gastrointestinal',
        unitPrice: 18.00,
        costPrice: 6.00,
        reorderLevel: 15,
        expiryDate: '2026-06-30', // Very close expiry!
        batchNumber: 'OME26F06',
      }
    ];

    // Seed products inside branches with realistic stock volumes
    seededBranches.forEach(branch => {
      medicineTemplates.forEach((med, idx) => {
        const id = `${branch.id}-${med.SKU}`;
        const ref = doc(productsRef, id);
        
        let stockQty = 120; // Default
        if (med.SKU === 'OME-20-08') {
          stockQty = 8; // Low stock triggers alert
        } else if (med.SKU === 'IBU-400-07' && branch.id === 'b-north') {
          stockQty = 5; // Low stock in kitwe
        } else {
          // Semi random variance
          stockQty = 45 + (idx * 15);
        }

        const product: Product = {
          id,
          name: med.name,
          SKU: med.SKU,
          barcode: med.barcode,
          category: med.category,
          unitPrice: med.unitPrice,
          costPrice: med.costPrice,
          stockQty,
          reorderLevel: med.reorderLevel,
          expiryDate: med.expiryDate,
          batchNumber: med.batchNumber,
          branchId: branch.id,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        batch.set(ref, product);
      });
    });

    // 4. SEED COMPREHENSIVE 7-DAY SALES DATA FOR DASHBOARD VISUALIZATIONS
    const salesRef = collection(db, 'sales');
    const today = new Date();
    
    // Generate dates for the previous 7 days
    const salesHistory: Sale[] = [];
    const clerks = ['System Operator', 'System Admin'];
    const branchIds = ['b-main', 'b-north', 'b-east'];

    for (let i = 6; i >= 0; i--) {
      const saleDate = new Date();
      saleDate.setDate(today.getDate() - i);
      const saleDateStr = saleDate.toISOString().split('T')[0];

      // Prepare 1 to 2 sales per day
      const dailySalesCount = i === 0 ? 2 : 1 + (i % 2); 
      for (let s = 1; s <= dailySalesCount; s++) {
        const saleId = `demo-sale-${saleDateStr}-${s}`;
        const ref = doc(salesRef, saleId);
        
        // Formulating items inside purchase
        const items = [
          {
            productId: 'b-main-AMX-500-01',
            name: 'Amoxicillin 500mg Unit',
            SKU: 'AMX-500-01',
            unitPrice: 15.00,
            costPrice: 6.50,
            quantity: 3 + (s % 3),
            discountAmount: 0.00,
            total: 15.00 * (3 + (s % 3))
          },
          {
            productId: 'b-main-PARA-500-02',
            name: 'Paracetamol 500mg Box',
            SKU: 'PARA-500-02',
            unitPrice: 2.50,
            costPrice: 0.80,
            quantity: 5 + (s * 2),
            discountAmount: 0.50,
            total: (2.50 * (5 + (s * 2))) - 0.50
          }
        ];

        const subtotal = items.reduce((acc, it) => acc + it.total, 0);
        const tax = subtotal * 0.15; // 15% VAT
        const total = subtotal + tax;

        const paymentMethods: ('cash' | 'card' | 'mobile_money' | 'split')[] = [
          'cash', 'card', 'mobile_money', 'split'
        ];
        const paymentMethod = paymentMethods[(i + s) % paymentMethods.length];

        const sale: Sale = {
          id: saleId,
          saleId: `ZW-${saleDateStr.replace(/-/g, '')}-${s}`,
          branchId: branchIds[(i + s) % branchIds.length],
          cashierId: 'system',
          cashierName: clerks[(i + s) % clerks.length],
          items,
          subtotal,
          discount: 0,
          tax,
          total,
          paymentMethod,
          paymentDetails: {
            notes: 'Simulated sandbox purchase'
          },
          status: 'completed',
          createdAt: `${saleDateStr}T${10 + s * 2}:30:00.000Z`
        };

        batch.set(ref, sale);
      }
    }

    // 5. SEED ACCOUNTING LEDGER JOURNAL ENTRIES
    const accountingRef = collection(db, 'accounting');
    const seededAccounting: AccountingEntry[] = [
      {
        id: 'acc-cap-main',
        type: 'ledger',
        category: 'Bank Balance',
        code: '1020',
        amount: 85200.00,
        description: 'Standard Chartered HQ Operating Account Capitalization',
        branchId: 'b-main',
        date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc-cash-main',
        type: 'ledger',
        category: 'Cash',
        code: '1010',
        amount: 3500.00,
        description: 'Petty cash opening register cash flow',
        branchId: 'b-main',
        date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc-exp-wages',
        type: 'expense',
        category: 'Wages & Salaries',
        code: '5010',
        amount: 2400.00,
        description: 'May pharmacy desk staff salaries pay slip dispatch',
        branchId: 'b-main',
        date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc-exp-utilities',
        type: 'expense',
        category: 'Utility Bills',
        code: '5060',
        amount: 480.00,
        description: 'ZESCO electrical power grid bill remittance',
        branchId: 'b-main',
        date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc-exp-purchases',
        type: 'expense',
        category: 'Inventory Purchase',
        code: '5010',
        amount: 3450.00,
        description: 'Bulk procurement buy from Pharco Logistics Ltd',
        branchId: 'b-main',
        date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      }
    ];

    seededAccounting.forEach(entry => {
      const ref = doc(accountingRef, entry.id);
      batch.set(ref, entry);
    });

    // 6. SEED INTER-BRANCH TRANSFERS
    const transfersRef = collection(db, 'transfers');
    const seededTransfers: TransferRequest[] = [
      {
        id: 't-req-pending',
        sourceBranchId: 'b-main',
        sourceBranchName: 'Central Plaza (HQ)',
        targetBranchId: 'b-north',
        targetBranchName: 'Northern Gate Clinic',
        requestedBy: 'system',
        requestedByName: 'System Operator',
        items: [
          {
            productId: 'b-main-AMX-500-01',
            name: 'Amoxicillin 500mg Unit',
            SKU: 'AMX-500-01',
            quantity: 50
          }
        ],
        status: 'pending',
        comments: 'Northern gate stock depleted due to local clinical trial',
        createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 't-req-approved',
        sourceBranchId: 'b-main',
        sourceBranchName: 'Central Plaza (HQ)',
        targetBranchId: 'b-east',
        targetBranchName: 'Eastern Gateway Depot',
        requestedBy: 'system',
        requestedByName: 'System Operator',
        approvedBy: 'system',
        approvedByName: 'System Admin',
        items: [
          {
            productId: 'b-main-PARA-500-02',
            name: 'Paracetamol 500mg Box',
            SKU: 'PARA-500-02',
            quantity: 150
          }
        ],
        status: 'approved',
        comments: 'Approved and dispatched from HQ cargo',
        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 650000).toISOString(),
        updatedAt: new Date(today.getTime() - 2 * 24 * 60 * 300000).toISOString()
      }
    ];

    seededTransfers.forEach(transfer => {
      const ref = doc(transfersRef, transfer.id);
      batch.set(ref, transfer);
    });

    // 7. SEED COMPREHENSIVE SETTINGS
    const globalSettingsRef = doc(db, 'settings', 'global');
    const enterpriseSettings: PharmacySettings = {
      pharmacyName: 'Zambezi Wellness Pharmacy',
      logo: '💊',
      currency: 'ZMW',
      taxRate: 15, // 15% standard
      receiptFooter: 'Thank you for choosing Zambezi Wellness Group. Stay healthy!',
      invoicePrefix: 'ZW-INV-',
      lowStockThreshold: 10,
      printerThermalWidth: '80mm',
      themeColor: '#10b981'
    };
    batch.set(globalSettingsRef, enterpriseSettings);

    // Commit all variables in a single transaction-ready bulk batch write
    await batch.commit();
    console.log("Database successfully seeded with realistic pharmacy multi-branch data!");
    return true;
  } catch (err: any) {
    console.error("Critical Failure seeding sandbox: ", err);
    throw err;
  }
}

export async function purgeAndSeedCompleteSystem(currentAdminUid?: string) {
  try {
    console.log("Starting a complete purge of database collections...");
    
    // List of collections we want to purge
    const collectionsToPurge = ['sales', 'products', 'branches', 'transfers', 'accounting', 'users', 'stockMovements'];
    
    for (const colName of collectionsToPurge) {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(docSnap => {
          // Keep current logged in admin user doc so they don't get broken on UI refresh
          if (colName === 'users' && currentAdminUid && docSnap.id === currentAdminUid) {
            console.log("Preserving logged in admin profile ID:", currentAdminUid);
            return;
          }
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        console.log(`Successfully purged collection: ${colName}`);
      }
    }
    
    // Now seed with complete fresh system data
    console.log("Calling database seeding after complete collection purge...");
    await seedCompleteSystem();
    
    return true;
  } catch (err: any) {
    console.error("Failure in purgeAndSeedCompleteSystem: ", err);
    throw err;
  }
}
