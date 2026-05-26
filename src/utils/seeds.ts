import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';

export async function seedProductsIfEmpty(branches: { id: string; name: string }[]) {
  try {
    const productsRef = collection(db, 'products');
    const snap = await getDocs(productsRef);
    
    // Only seed if no products exist
    if (!snap.empty) {
      return;
    }

    const batch = writeBatch(db);

    const baseMedications = [
      {
        name: 'Amoxicillin 500mg (Cap)',
        SKU: 'AMX-500-01',
        barcode: '6001234567891',
        category: 'Antibiotics',
        unitPrice: 15.00,
        costPrice: 6.50,
        reorderLevel: 25,
        expiryDate: '2027-12-15',
        batchNumber: 'AMX2712',
      },
      {
        name: 'Paracetamol 500mg (Tab)',
        SKU: 'PARA-500-02',
        barcode: '6001234567892',
        category: 'Analgesics / Pain',
        unitPrice: 2.50,
        costPrice: 0.80,
        reorderLevel: 50,
        expiryDate: '2028-04-10',
        batchNumber: 'PCM2804',
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
        batchNumber: 'MET2609',
      },
      {
        name: 'Atorvastatin 20mg (Cap)',
        SKU: 'ATO-20-04',
        barcode: '6001234567894',
        category: 'Cardiovascular',
        unitPrice: 24.50,
        costPrice: 9.80,
        reorderLevel: 15,
        expiryDate: '2026-06-25', // Expiring relatively soon (June 2026)
        batchNumber: 'ATO2606',
      },
      {
        name: 'Vitamin C 1000mg Chewable',
        SKU: 'VITC-1000-05',
        barcode: '6001234567895',
        category: 'Supplements',
        unitPrice: 8.90,
        costPrice: 3.50,
        reorderLevel: 30,
        expiryDate: '2028-01-01',
        batchNumber: 'VTC2801',
      },
      {
        name: 'Amlodipine 5mg (Tab)',
        SKU: 'AML-5-06',
        barcode: '6001234567896',
        category: 'Cardiovascular',
        unitPrice: 11.20,
        costPrice: 4.00,
        reorderLevel: 25,
        expiryDate: '2027-11-20',
        batchNumber: 'AML2711',
      },
      {
        name: 'Ibuprofen 400mg (Tab)',
        SKU: 'IBU-400-07',
        barcode: '6001234567897',
        category: 'Analgesics / Pain',
        unitPrice: 4.50,
        costPrice: 1.50,
        reorderLevel: 40,
        expiryDate: '2027-08-14',
        batchNumber: 'IBU2708',
      },
      {
        name: 'Omeprazole 20mg (Cap)',
        SKU: 'OME-20-08',
        barcode: '6001234567898',
        category: 'Gastrointestinal',
        unitPrice: 18.00,
        costPrice: 6.00,
        reorderLevel: 15,
        expiryDate: '2026-05-30', // Very close expiry!
        batchNumber: 'OME2605',
      }
    ];

    // Create inventories for each branch
    branches.forEach((branch) => {
      baseMedications.forEach((med, idx) => {
        const id = `${branch.id}-${med.SKU}`;
        const ref = doc(db, 'products', id);
        
        // Randomize initial stock sizes slightly so stock numbers look distinct
        const stockQty = idx % 2 === 0 ? 45 : 8; // Some low stock items for alert testing (8 is below 10 low threshold for many)
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

    // Seed visual initial general accounting accounts
    const accountingRef = collection(db, 'accounting');
    const accounts = [
      { id: 'acc-1010', type: 'ledger', category: 'Cash', code: '1010', amount: 4500, description: 'Petty cash opening register', date: '2026-05-01', branchId: 'b-main' },
      { id: 'acc-1020', type: 'ledger', category: 'Bank Balance', code: '1020', amount: 80000, description: 'Standard Chartered HQ account', date: '2026-05-01', branchId: 'b-main' },
      { id: 'acc-5010', type: 'expense', category: 'Inventory Purchase', code: '5010', amount: 1540, description: 'Vendor shipment buy #48102', date: '2026-05-10', branchId: 'b-main' },
      { id: 'acc-5020', type: 'expense', category: 'Rent Expense', code: '5050', amount: 1200, description: 'May central plaza rent payment', date: '2026-05-01', branchId: 'b-main' },
      { id: 'acc-5030', type: 'expense', category: 'Utility Bills', code: '5060', amount: 350, description: 'Power grid electricity expense', date: '2026-05-15', branchId: 'b-main' }
    ];

    accounts.forEach((acc) => {
      const ref = doc(accountingRef, acc.id);
      batch.set(ref, {
        type: acc.type,
        category: acc.category,
        code: acc.code,
        amount: acc.amount,
        description: acc.description,
        branchId: acc.branchId,
        date: acc.date,
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();
    console.log('Successfully seeded database with medications and basic accounting accounts!');
  } catch (error) {
    console.error('Failed to seed items database:', error);
  }
}
