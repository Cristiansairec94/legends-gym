import type { CartItem, PaymentMethod, Product, ProductCategory, Sale, UserRole } from '../types';

interface RawLegacyItem {
  id?: string;
  name?: string;
  brand?: string;
  price?: number;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
  total?: number;
  product?: Partial<Product> | null;
}

interface RawSaleInput extends Partial<Omit<Sale, 'items'>> {
  items?: RawLegacyItem[];
  authorizedBy?: string;
  source?: string;
}

const VALID_PRODUCT_CATEGORIES = new Set<ProductCategory>([
  'protein',
  'creatine',
  'preworkout',
  'aminoacids',
  'beverage',
  'snack',
  'gear',
]);

/** Returns a finite numeric value from an untyped field, falling back cleanly. */
export const toSafeNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Returns a safe display name from either a normalized CartItem or flat visit-pass item. */
export const getSaleItemLabel = (
  item: { product?: { name?: string } | null; name?: string } | null | undefined,
  fallback = 'Artículo'
): string => {
  const label = item?.product?.name || item?.name;
  return typeof label === 'string' && label.trim() ? label.trim() : fallback;
};

/** Returns true when a product ID represents a non-inventory pass or membership item. */
export const isNonInventorySaleItem = (productId: string | undefined): boolean => {
  if (!productId) return true;
  return productId.startsWith('PLAN-') || productId.startsWith('ITEM_VISIT');
};

/** Normalizes any CartItem (including flat visit-pass objects missing `.product`) into a valid CartItem. */
export const normalizeCartItem = (raw: unknown): CartItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as RawLegacyItem;
  const rawProduct = item.product && typeof item.product === 'object' ? item.product : null;

  const quantity = Math.max(1, toSafeNumber(item.quantity, 1));
  const unitPrice = toSafeNumber(item.unitPrice ?? item.price ?? rawProduct?.price, 0);
  const subtotal = toSafeNumber(item.subtotal ?? item.total, Math.round(unitPrice * quantity * 100) / 100);

  const rawCategory = rawProduct?.category;
  const category: ProductCategory =
    rawCategory && VALID_PRODUCT_CATEGORIES.has(rawCategory) ? rawCategory : 'gear';

  const product: Product = {
    id: String(rawProduct?.id || item.id || 'ITEM-CUSTOM'),
    name: String(rawProduct?.name || item.name || 'Artículo / Pase'),
    brand: String(rawProduct?.brand || item.brand || 'LEYENDS'),
    category,
    price: toSafeNumber(rawProduct?.price, unitPrice),
    costPrice: toSafeNumber(rawProduct?.costPrice, 0),
    stock: toSafeNumber(rawProduct?.stock, 0),
    minStock: toSafeNumber(rawProduct?.minStock, 0),
    image: String(rawProduct?.image || ''),
    barcode: String(rawProduct?.barcode || ''),
    description: String(rawProduct?.description || ''),
    ...(rawProduct?.flavor ? { flavor: rawProduct.flavor } : {}),
    ...(rawProduct?.servingSize ? { servingSize: rawProduct.servingSize } : {}),
    ...(rawProduct?.sku ? { sku: rawProduct.sku } : {}),
    ...(rawProduct?.taxRate ? { taxRate: rawProduct.taxRate } : {}),
    ...(rawProduct?.soldByScoop !== undefined ? { soldByScoop: rawProduct.soldByScoop } : {}),
    ...(rawProduct?.scoopPrice !== undefined ? { scoopPrice: rawProduct.scoopPrice } : {}),
    ...(rawProduct?.scoopsPerContainer !== undefined ? { scoopsPerContainer: rawProduct.scoopsPerContainer } : {}),
  };

  return {
    product,
    quantity,
    unitPrice,
    subtotal,
  };
};

/** Normalizes any raw, synced, or legacy visit-pass sale record into a complete Sale object. */
export const normalizeSaleRecord = (raw: unknown): Sale | null => {
  if (!raw || typeof raw !== 'object') return null;
  const rawSale = raw as RawSaleInput;

  const id = String(rawSale.id || `SALE-${Date.now()}`);
  const isVisitSale =
    id.startsWith('SALE_VISIT_') ||
    id.startsWith('SALE-VISIT-') ||
    rawSale.source === 'terminal_visit_authorized';

  const folio =
    typeof rawSale.folio === 'string' && rawSale.folio.trim()
      ? rawSale.folio.trim()
      : isVisitSale
      ? `VIS-${id.slice(-4)}`
      : id;

  const items: CartItem[] = Array.isArray(rawSale.items)
    ? rawSale.items.map(normalizeCartItem).filter((it): it is CartItem => it !== null)
    : [];

  const itemsTotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const total = toSafeNumber(rawSale.total, itemsTotal);
  const subtotal = toSafeNumber(rawSale.subtotal, total);
  const tax = toSafeNumber(rawSale.tax, 0);
  const amountPaid = toSafeNumber(rawSale.amountPaid, total);
  const changeGiven = toSafeNumber(rawSale.changeGiven, 0);

  const paymentMethod: PaymentMethod =
    rawSale.paymentMethod === 'cash' || rawSale.paymentMethod === 'card' || rawSale.paymentMethod === 'transfer'
      ? rawSale.paymentMethod
      : 'cash';

  const cashierRole: UserRole = rawSale.cashierRole === 'admin' ? 'admin' : 'receptionist';

  const saleType: 'store' | 'membership' =
    rawSale.saleType === 'membership' || rawSale.saleType === 'store'
      ? rawSale.saleType
      : isVisitSale
      ? 'membership'
      : 'store';

  const cashierName =
    (typeof rawSale.cashierName === 'string' && rawSale.cashierName.trim()) ||
    (typeof rawSale.authorizedBy === 'string' && rawSale.authorizedBy.trim()) ||
    'Recepción Mostrador';

  return {
    ...(rawSale as Partial<Sale>),
    id,
    folio,
    timestamp:
      typeof rawSale.timestamp === 'string' && rawSale.timestamp.trim()
        ? rawSale.timestamp
        : new Date().toISOString(),
    ...(typeof rawSale.clientId === 'string' && rawSale.clientId ? { clientId: rawSale.clientId } : {}),
    clientName:
      typeof rawSale.clientName === 'string' && rawSale.clientName.trim()
        ? rawSale.clientName
        : 'Público en General',
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    amountPaid,
    changeGiven,
    cashierName,
    cashierRole,
    saleType,
  };
};

/** Normalizes an array of arbitrary sale payloads, filtering out invalid entries. */
export const normalizeSaleList = (list: unknown): Sale[] => {
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeSaleRecord)
    .filter((sale): sale is Sale => sale !== null);
};
