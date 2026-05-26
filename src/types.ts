export type UserRole = 'admin' | 'manager' | 'assistant' | 'cashier';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  branchId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  SKU: string;
  barcode: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  stockQty: number;
  reorderLevel: number;
  expiryDate: string; // ISO format or YYYY-MM-DD
  batchNumber: string;
  branchId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountAmount: number; // custom discount per item
}

export interface Sale {
  id: string;
  saleId: string; // Printable transaction ref number
  branchId: string;
  cashierId: string;
  cashierName: string;
  items: {
    productId: string;
    name: string;
    SKU: string;
    unitPrice: number;
    costPrice: number;
    quantity: number;
    discountAmount: number;
    total: number;
  }[];
  subtotal: number;
  discount: number; // Group wide discount
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'split';
  paymentDetails: {
    cashAmount?: number;
    cardAmount?: number;
    mobileMoneyAmount?: number;
    mobileMoneyReference?: string;
    notes?: string;
  };
  status: 'completed' | 'on_hold' | 'voided';
  createdAt: string;
}

export interface TransferItem {
  productId: string;
  name: string;
  SKU: string;
  quantity: number;
}

export interface TransferRequest {
  id: string;
  sourceBranchId: string;
  sourceBranchName: string;
  targetBranchId: string;
  targetBranchName: string;
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  items: TransferItem[];
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingEntry {
  id: string;
  type: 'expense' | 'revenue' | 'ledger' | 'journal';
  category: string; // e.g. "Purchases", "Wages", "Sales Revenue", "Utility bills"
  code: string; // Chart of Account code, e.g. "5010", "4010"
  amount: number;
  description: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface ChartOfAccount {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
}

export interface PharmacySettings {
  pharmacyName: string;
  logo: string;
  currency: string;
  taxRate: number; // e.g. 15 for 15%
  receiptFooter: string;
  invoicePrefix: string;
  lowStockThreshold: number;
  printerThermalWidth?: '80mm' | '58mm';
  themeColor?: string;
}
