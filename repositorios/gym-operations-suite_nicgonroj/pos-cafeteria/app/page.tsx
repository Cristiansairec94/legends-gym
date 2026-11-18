"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShellHeader } from "@/app/components/app-shell-header";
import type { ShiftSession } from "@/app/components/cash-closures-panel";
import { DebtsPanel } from "@/app/components/debts-panel";
import { TodaySalesPanel } from "@/app/components/today-sales-panel";
import { COLLABORATORS, SHIFTS } from "@/lib/business";

type PaidPaymentMethod = "efectivo" | "tarjeta" | "transferencia";
type PaymentMethod = PaidPaymentMethod | "pendiente" | "colaborador";
type PaymentStatus = "paid" | "pending" | "verification_pending";
type StockMode = "untracked" | "simple" | "split";
type ManagerView = "stock-entry" | "product";
type StockEntryLocation = "simple" | "vitrina" | "bodega";
type StockEntryTargetKind = "product" | "ingredient";
type Shift = (typeof SHIFTS)[number];
type Collaborator = (typeof COLLABORATORS)[number];
type PosRole = "admin" | "sales";

type Product = {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  priceClp: number;
  stockMode: StockMode;
  stock: number | null;
  stockVitrina: number | null;
  stockBodega: number | null;
  availableStock: number | null;
  stockGroup: string | null;
  updatedAt: string;
  active: boolean;
  needsPriceReview: boolean;
};

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  revision: number;
  updatedAt: string;
};

type InventoryStockEntry = {
  id: string;
  itemType: StockEntryTargetKind;
  itemId: string;
  itemName: string;
  location: StockEntryLocation | "ingredient";
  quantityBefore: number;
  quantityAdded: number;
  quantityAfter: number;
  createdAt: string;
};

type StockEntryAttempt = {
  id: string;
  targetKind: StockEntryTargetKind;
  targetId: string;
  location: StockEntryLocation | null;
  quantity: number;
};

type SaleItem = {
  productId: string;
  productName: string;
  unitPriceClp: number;
  quantity: number;
  lineTotalClp: number;
};

type Sale = {
  id: string;
  createdAt: string;
  paymentMethod: PaymentMethod | null;
  settledPaymentMethod: PaidPaymentMethod | null;
  paymentStatus: PaymentStatus;
  debtNote: string | null;
  debtorCollaborator: string | null;
  paidAt: string | null;
  seller: string | null;
  shift: Shift | null;
  totalClp: number;
  paidClp: number;
  balanceClp: number;
  paymentCount: number;
  items: SaleItem[];
};

type ActiveShiftSummary = {
  sessionId: string;
  businessDate: string;
  shift: Shift;
  activityRevision: number;
  includedSalesClp: number;
  includedSalesCount: number;
  cashCollectedClp: number;
  cardCollectedClp: number;
  transferCollectedClp: number;
  settlementCollectedClp: number;
  totalCollectedClp: number;
};

type PosData = {
  role: PosRole;
  activeSession: ShiftSession | null;
  activeShiftSummary: ActiveShiftSummary | null;
  products: Product[];
  sales?: Sale[];
};

type ProductFormState = {
  sku: string;
  name: string;
  category: string;
  priceClp: string;
  stockMode: StockMode;
  stock: string;
  stockVitrina: string;
  stockBodega: string;
  active: boolean;
  needsPriceReview: boolean;
};

type OpeningAttempt = {
  id: string;
  shift: Shift;
  responsible: Collaborator;
  openingCashClp: number;
};

const EMPTY_PRODUCT_FORM: ProductFormState = {
  sku: "",
  name: "",
  category: "Cafés",
  priceClp: "",
  stockMode: "untracked",
  stock: "",
  stockVitrina: "",
  stockBodega: "",
  active: true,
  needsPriceReview: false,
};

const PAID_PAYMENT_METHODS: Array<{ value: PaidPaymentMethod; label: string }> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  ...PAID_PAYMENT_METHODS,
  { value: "pendiente", label: "Pendiente" },
  { value: "colaborador", label: "Colaborador" },
];

const CATEGORY_TONES = ["tone-cocoa", "tone-latte", "tone-sage", "tone-gold", "tone-berry"];
const CATEGORY_ORDER = ["Cafés", "Alimentos", "Batidos", "Scoops", "Refrigerador", "Tienda"];
const MAX_DISTINCT_SALE_PRODUCTS = 10;
const MAX_STOCK_ENTRY_QUANTITY = 1_000_000;
const STOCK_ENTRY_ATTEMPT_STORAGE_KEY = "demogymcafe.pending-stock-entry.v1";

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function validWholeNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function usesIngredientStock(product: Product | undefined) {
  return (
    product?.stockGroup?.startsWith("ingredient:") === true ||
    product?.stockGroup?.startsWith("recipe:") === true
  );
}

function availableStock(product: Product): number | null {
  if (product.availableStock !== undefined) return product.availableStock;
  if (product.stockMode === "untracked") return null;
  if (product.stockMode === "split") return product.stockVitrina ?? 0;
  return product.stock ?? 0;
}

function productStockLabel(product: Product) {
  const available = availableStock(product);
  if (product.stockGroup?.startsWith("ingredient:")) {
    return available === 0
      ? "Sin stock compartido"
      : `${available ?? 0} disp. · Stock compartido`;
  }
  if (available === null) return "Sin control";
  if (product.stockMode === "split") {
    const vitrina = product.stockVitrina ?? 0;
    const bodega = product.stockBodega ?? 0;
    return vitrina === 0
      ? `Vitrina vacía · Bodega ${bodega}`
      : `Vitrina ${vitrina} · Bodega ${bodega}`;
  }
  return available === 0 ? "Sin stock" : `${available} disp.`;
}

function managerStockLabel(product: Product) {
  if (product.stockGroup?.startsWith("ingredient:")) {
    const available = availableStock(product) ?? 0;
    return `${available} disp. · Stock compartido`;
  }
  if (product.stockMode === "untracked") return "Sin control de stock";
  if (product.stockMode === "split") {
    return `Vitrina ${product.stockVitrina ?? 0} · Bodega ${product.stockBodega ?? 0}`;
  }
  return `Stock ${product.stock ?? 0}`;
}

function stockEntryTargetValue(kind: StockEntryTargetKind, id: string) {
  return `${kind}:${id}`;
}

function parseStockEntryTarget(value: string): {
  kind: StockEntryTargetKind;
  id: string;
} | null {
  if (value.startsWith("product:")) {
    return { kind: "product", id: value.slice("product:".length) };
  }
  if (value.startsWith("ingredient:")) {
    return { kind: "ingredient", id: value.slice("ingredient:".length) };
  }
  return null;
}

function parseStoredStockEntryAttempt(value: string): StockEntryAttempt | null {
  try {
    const candidate = JSON.parse(value) as Partial<StockEntryAttempt>;
    const locationValid =
      candidate.targetKind === "ingredient"
        ? candidate.location === null
        : candidate.location === "simple" ||
          candidate.location === "vitrina" ||
          candidate.location === "bodega";
    if (
      typeof candidate.id !== "string" ||
      !candidate.id ||
      (candidate.targetKind !== "product" && candidate.targetKind !== "ingredient") ||
      typeof candidate.targetId !== "string" ||
      !candidate.targetId ||
      !locationValid ||
      !Number.isSafeInteger(candidate.quantity) ||
      Number(candidate.quantity) < 1 ||
      Number(candidate.quantity) > MAX_STOCK_ENTRY_QUANTITY
    ) {
      return null;
    }
    return candidate as StockEntryAttempt;
  } catch {
    return null;
  }
}

function persistStockEntryAttempt(attempt: StockEntryAttempt | null) {
  try {
    if (attempt) {
      window.localStorage.setItem(STOCK_ENTRY_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt));
    } else {
      window.localStorage.removeItem(STOCK_ENTRY_ATTEMPT_STORAGE_KEY);
    }
  } catch {
    // El estado en memoria sigue protegiendo los reintentos de la pestaña actual.
  }
}

function cartStockGroupQuantity(
  currentCart: Record<string, number>,
  targetProduct: Product,
  products: Product[],
) {
  if (!targetProduct.stockGroup) return currentCart[targetProduct.id] ?? 0;
  const productsById = new Map(products.map((product) => [product.id, product]));
  return Object.entries(currentCart).reduce((total, [productId, quantity]) => {
    const product = productsById.get(productId);
    return product?.stockGroup === targetProduct.stockGroup ? total + quantity : total;
  }, 0);
}

function cartStockGroupLimit(
  currentCart: Record<string, number>,
  targetProduct: Product,
  products: Product[],
): number | null {
  const targetAvailable = availableStock(targetProduct);
  if (!targetProduct.stockGroup) return targetAvailable;

  const limits = products
    .filter(
      (product) =>
        product.stockGroup === targetProduct.stockGroup &&
        (product.id === targetProduct.id || (currentCart[product.id] ?? 0) > 0),
    )
    .map(availableStock)
    .filter((stock): stock is number => stock !== null);
  return limits.length ? Math.min(...limits) : null;
}

function categoryTone(category: string) {
  let total = 0;
  for (const character of category) total += character.charCodeAt(0);
  return CATEGORY_TONES[total % CATEGORY_TONES.length];
}

function productCardCopy(product: Product) {
  if (product.category !== "Batidos") {
    return { title: product.name, detail: product.category };
  }

  const [title, ...details] = product.name.split(" · ");
  return {
    title,
    detail: details.length
      ? details.join(" · ").replace(" (normal)", " · Normal")
      : product.category,
  };
}

class HttpResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpResponseError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  let payload: T & { error?: string };
  try {
    payload = (await response.json()) as T & { error?: string };
  } catch (error) {
    if (!response.ok) {
      throw new HttpResponseError(
        `La solicitud fue rechazada (${response.status}).`,
        response.status,
      );
    }
    throw error;
  }
  if (!response.ok) {
    throw new HttpResponseError(
      payload.error || "Ocurrió un error inesperado.",
      response.status,
    );
  }
  return payload;
}

export default function Home() {
  const [data, setData] = useState<PosData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [debtNote, setDebtNote] = useState("");
  const [debtorCollaborator, setDebtorCollaborator] = useState<Collaborator | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const [debtsRefreshSignal, setDebtsRefreshSignal] = useState(0);
  const [todaySalesRefreshSignal, setTodaySalesRefreshSignal] = useState(0);
  const [refreshingShiftSummary, setRefreshingShiftSummary] = useState(false);
  const paymentMethodRef = useRef<HTMLInputElement>(null);
  const debtNoteRef = useRef<HTMLInputElement>(null);
  const debtorCollaboratorRef = useRef<HTMLSelectElement>(null);
  const catalogTitleRef = useRef<HTMLHeadingElement>(null);

  const [openingShift, setOpeningShift] = useState<Shift | "">("");
  const [openingResponsible, setOpeningResponsible] = useState<Collaborator | "">("");
  const [openingCashClp, setOpeningCashClp] = useState("");
  const [openingAttempt, setOpeningAttempt] = useState<OpeningAttempt | null>(null);
  const [opening, setOpening] = useState(false);
  const [openingDismissed, setOpeningDismissed] = useState(false);
  const [openingSubmitted, setOpeningSubmitted] = useState(false);
  const [openingTouched, setOpeningTouched] = useState<Set<string>>(new Set());
  const [openingError, setOpeningError] = useState("");
  const shiftDialogRef = useRef<HTMLDialogElement>(null);
  const openingShiftRef = useRef<HTMLSelectElement>(null);
  const openingResponsibleRef = useRef<HTMLSelectElement>(null);
  const openingCashRef = useRef<HTMLInputElement>(null);
  const openingReturnFocusRef = useRef<HTMLElement | null>(null);
  const posRequestSequenceRef = useRef(0);

  const [managerOpen, setManagerOpen] = useState(false);
  const [managerView, setManagerView] = useState<ManagerView>("stock-entry");
  const [managedProducts, setManagedProducts] = useState<Product[]>([]);
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerError, setManagerError] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductUpdatedAt, setEditingProductUpdatedAt] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientDrafts, setIngredientDrafts] = useState<Record<string, string>>({});
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [ingredientsError, setIngredientsError] = useState("");
  const [ingredientErrors, setIngredientErrors] = useState<Record<string, string>>({});
  const [savingIngredientId, setSavingIngredientId] = useState<string | null>(null);
  const [stockEntryTarget, setStockEntryTarget] = useState("");
  const [stockEntryLocation, setStockEntryLocation] = useState<StockEntryLocation | "">("");
  const [stockEntryQuantity, setStockEntryQuantity] = useState("");
  const [stockEntryReviewing, setStockEntryReviewing] = useState(false);
  const [stockEntryAttempt, setStockEntryAttempt] = useState<StockEntryAttempt | null>(null);
  const [stockEntrySaving, setStockEntrySaving] = useState(false);
  const [stockEntryError, setStockEntryError] = useState("");
  const [stockEntrySuccess, setStockEntrySuccess] = useState<InventoryStockEntry | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const editorTitleRef = useRef<HTMLHeadingElement>(null);
  const stockEntryTargetRef = useRef<HTMLSelectElement>(null);
  const role = data?.role;
  const isAdmin = role === "admin";
  const activeSession = data?.activeSession ?? null;
  const loadedShiftSummary = data?.activeShiftSummary ?? null;
  const activeShiftSummary = loadedShiftSummary?.sessionId === activeSession?.id
    ? loadedShiftSummary
    : null;
  const openingShiftValue = openingAttempt?.shift ?? openingShift;
  const openingResponsibleValue = openingAttempt?.responsible ?? openingResponsible;
  const openingCashValue = openingAttempt
    ? String(openingAttempt.openingCashClp)
    : openingCashClp;
  const openingCash = validWholeNumber(openingCashValue);

  const loadPos = useCallback(async () => {
    const requestSequence = ++posRequestSequenceRef.current;
    try {
      setLoadError("");
      const response = await fetch("/api/pos", { cache: "no-store" });
      const payload = await readJson<PosData>(response);
      if (requestSequence !== posRequestSequenceRef.current) return null;
      setData(payload);
      return payload;
    } catch (error) {
      if (requestSequence !== posRequestSequenceRef.current) return null;
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar la caja.");
      return null;
    }
  }, []);

  const loadManagedProducts = useCallback(async () => {
    try {
      setManagerLoading(true);
      setManagerError("");
      const response = await fetch("/api/products", { cache: "no-store" });
      const payload = await readJson<{ products: Product[] }>(response);
      setManagedProducts(payload.products);
      return payload.products;
    } catch (error) {
      setManagerError(error instanceof Error ? error.message : "No se pudo cargar el catálogo.");
      return null;
    } finally {
      setManagerLoading(false);
    }
  }, []);

  async function refreshShiftSummary() {
    setRefreshingShiftSummary(true);
    await loadPos();
    setRefreshingShiftSummary(false);
  }

  const loadIngredients = useCallback(async (options: {
    preserveDrafts?: boolean;
    resetIngredientId?: string;
  } = {}) => {
    try {
      setIngredientsLoading(true);
      setIngredientsError("");
      if (!options.preserveDrafts) setIngredientErrors({});
      const response = await fetch("/api/ingredients", { cache: "no-store" });
      const payload = await readJson<{ ingredients: Ingredient[] }>(response);
      setIngredients(payload.ingredients);
      setIngredientDrafts((current) =>
        Object.fromEntries(
          payload.ingredients.map((ingredient) => [
            ingredient.id,
            options.preserveDrafts && ingredient.id !== options.resetIngredientId
              ? (current[ingredient.id] ?? String(ingredient.stock))
              : String(ingredient.stock),
          ]),
        ),
      );
      return payload.ingredients;
    } catch (error) {
      setIngredientsError(error instanceof Error ? error.message : "No se pudieron cargar los insumos.");
      return null;
    } finally {
      setIngredientsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPos(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPos]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STOCK_ENTRY_ATTEMPT_STORAGE_KEY);
      if (!stored) return;
      const attempt = parseStoredStockEntryAttempt(stored);
      if (!attempt) {
        window.localStorage.removeItem(STOCK_ENTRY_ATTEMPT_STORAGE_KEY);
        return;
      }
      setStockEntryAttempt(attempt);
      setStockEntryTarget(stockEntryTargetValue(attempt.targetKind, attempt.targetId));
      setStockEntryLocation(attempt.location ?? "");
      setStockEntryQuantity(String(attempt.quantity));
      setStockEntryError(
        "Recuperamos un ingreso pendiente de confirmar. Reintenta la misma operación para evitar duplicarla.",
      );
    } catch {
      // El flujo sigue disponible aunque el navegador bloquee el almacenamiento local.
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (managerOpen && isAdmin && !dialog.open) dialog.showModal();
    if (!managerOpen && dialog.open) dialog.close();
  }, [isAdmin, managerOpen]);

  useEffect(() => {
    const dialog = shiftDialogRef.current;
    if (!dialog || !data || loadError) return;
    if (!activeSession && !openingDismissed && !dialog.open) {
      openingReturnFocusRef.current = catalogTitleRef.current;
      dialog.showModal();
      window.requestAnimationFrame(() => openingShiftRef.current?.focus());
      return;
    }
    if (activeSession && dialog.open) {
      dialog.close();
      window.requestAnimationFrame(() => catalogTitleRef.current?.focus());
    }
  }, [activeSession, data, loadError, openingDismissed]);

  const products = useMemo(() => data?.products ?? [], [data]);
  const editingProductUsesIngredients = usesIngredientStock(
    managedProducts.find((product) => product.id === editingProductId),
  );
  const splitStockTotal =
    (Number(productForm.stockVitrina) || 0) + (Number(productForm.stockBodega) || 0);
  const stockEntryProducts = useMemo(
    () => managedProducts.filter(
      (product) => product.stockMode !== "untracked" && !usesIngredientStock(product),
    ),
    [managedProducts],
  );
  const parsedStockEntryTarget = parseStockEntryTarget(stockEntryTarget);
  const stockEntryProduct = parsedStockEntryTarget?.kind === "product"
    ? stockEntryProducts.find((product) => product.id === parsedStockEntryTarget.id) ?? null
    : null;
  const stockEntryIngredient = parsedStockEntryTarget?.kind === "ingredient"
    ? ingredients.find((ingredient) => ingredient.id === parsedStockEntryTarget.id) ?? null
    : null;
  const stockEntryQuantityNumber = Number(stockEntryQuantity);
  const stockEntryQuantityValid = Boolean(stockEntryQuantity.trim()) &&
    Number.isSafeInteger(stockEntryQuantityNumber) &&
    stockEntryQuantityNumber >= 1 &&
    stockEntryQuantityNumber <= MAX_STOCK_ENTRY_QUANTITY;
  const stockEntryLocationValid = Boolean(
    stockEntryIngredient ||
    (stockEntryProduct?.stockMode === "simple" && stockEntryLocation === "simple") ||
    (stockEntryProduct?.stockMode === "split" &&
      (stockEntryLocation === "vitrina" || stockEntryLocation === "bodega")),
  );
  const stockEntryCurrentQuantity = stockEntryIngredient
    ? stockEntryIngredient.stock
    : stockEntryProduct?.stockMode === "simple"
      ? stockEntryProduct.stock
      : stockEntryProduct?.stockMode === "split" && stockEntryLocation === "vitrina"
        ? stockEntryProduct.stockVitrina
        : stockEntryProduct?.stockMode === "split" && stockEntryLocation === "bodega"
          ? stockEntryProduct.stockBodega
          : null;
  const stockEntryUnit = stockEntryIngredient?.unit ?? "unidades";
  const stockEntryNewQuantity =
    stockEntryCurrentQuantity !== null && stockEntryQuantityValid
      ? stockEntryCurrentQuantity + stockEntryQuantityNumber
      : null;
  const stockEntryFormValid = Boolean(
    parsedStockEntryTarget &&
    (stockEntryProduct || stockEntryIngredient) &&
    stockEntryLocationValid &&
    stockEntryQuantityValid,
  );
  const categories = useMemo(() => {
    const available = new Set(products.map((product) => product.category));
    const known = CATEGORY_ORDER.filter((item) => available.delete(item));
    const custom = Array.from(available).sort((left, right) => left.localeCompare(right, "es"));
    return ["Todos", ...known, ...custom];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    return products
      .filter((product) => {
        const matchesCategory = category === "Todos" || product.category === category;
        const matchesSearch =
          !normalizedSearch ||
          product.name.toLocaleLowerCase("es").includes(normalizedSearch) ||
          product.sku?.toLocaleLowerCase("es").includes(normalizedSearch);
        return matchesCategory && matchesSearch;
      })
      .sort((left, right) => {
        const leftRank = CATEGORY_ORDER.indexOf(left.category);
        const rightRank = CATEGORY_ORDER.indexOf(right.category);
        const normalizedLeftRank = leftRank === -1 ? CATEGORY_ORDER.length : leftRank;
        const normalizedRightRank = rightRank === -1 ? CATEGORY_ORDER.length : rightRank;
        return (
          normalizedLeftRank - normalizedRightRank ||
          left.category.localeCompare(right.category, "es") ||
          left.name.localeCompare(right.name, "es")
        );
      });
  }, [category, products, search]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = products.find((candidate) => candidate.id === productId);
          return product ? { product, quantity, lineTotalClp: product.priceClp * quantity } : null;
        })
        .filter((line): line is { product: Product; quantity: number; lineTotalClp: number } => Boolean(line)),
    [cart, products],
  );

  const cartUnits = cartLines.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cartLines.reduce((total, line) => total + line.lineTotalClp, 0);

  function addProduct(product: Product) {
    setCheckoutError("");
    setPendingSaleId(null);
    if (
      cart[product.id] === undefined &&
      Object.keys(cart).length >= MAX_DISTINCT_SALE_PRODUCTS
    ) {
      setCheckoutError(
        `Cada venta admite hasta ${MAX_DISTINCT_SALE_PRODUCTS} productos diferentes. Registra otra venta para continuar.`,
      );
      return;
    }
    setCart((current) => {
      const usedByGroup = cartStockGroupQuantity(current, product, products);
      const groupLimit = cartStockGroupLimit(current, product, products);
      if (groupLimit !== null && usedByGroup >= groupLimit) return current;
      const currentQuantity = current[product.id] ?? 0;
      return { ...current, [product.id]: Math.min(currentQuantity + 1, 99) };
    });
  }

  function updateQuantity(product: Product, nextQuantity: number) {
    setCheckoutError("");
    setPendingSaleId(null);
    setCart((current) => {
      const currentQuantity = current[product.id] ?? 0;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      if (nextQuantity < currentQuantity) {
        return { ...current, [product.id]: Math.min(nextQuantity, 99) };
      }
      const usedByGroup = cartStockGroupQuantity(current, product, products);
      const usedByOtherProducts = usedByGroup - currentQuantity;
      const groupLimit = cartStockGroupLimit(current, product, products);
      if (groupLimit !== null && usedByGroup >= groupLimit) return current;
      const maxQuantity = groupLimit === null
        ? 99
        : Math.max(0, groupLimit - usedByOtherProducts);
      return { ...current, [product.id]: Math.min(nextQuantity, maxQuantity, 99) };
    });
  }

  function clearSale() {
    if (cartUnits > 0 && !window.confirm("¿Quieres limpiar la venta actual?")) return;
    setCart({});
    setPaymentMethod("");
    setDebtNote("");
    setDebtorCollaborator("");
    setCheckoutError("");
    setPendingSaleId(null);
  }

  async function submitSale() {
    if (!cartLines.length) {
      setCheckoutError("Selecciona al menos un producto para registrar la venta.");
      return;
    }
    if (cartLines.length > MAX_DISTINCT_SALE_PRODUCTS) {
      setCheckoutError(
        `Cada venta admite hasta ${MAX_DISTINCT_SALE_PRODUCTS} productos diferentes.`,
      );
      return;
    }
    const lineWithoutStock = cartLines.find(({ product }) => {
      const usedByGroup = cartStockGroupQuantity(cart, product, products);
      const groupLimit = cartStockGroupLimit(cart, product, products);
      return groupLimit !== null && usedByGroup > groupLimit;
    });
    if (lineWithoutStock) {
      setCheckoutError(
        `La disponibilidad de ${lineWithoutStock.product.name} cambió. Reduce la cantidad antes de cobrar.`,
      );
      return;
    }
    if (!activeSession) {
      setCheckoutError("No hay un turno abierto. Abre un turno antes de registrar la venta.");
      showOpeningDialog();
      return;
    }
    if (!paymentMethod) {
      setCheckoutError("Selecciona el medio de pago.");
      window.requestAnimationFrame(() => paymentMethodRef.current?.focus());
      return;
    }
    if (paymentMethod === "pendiente" && !debtNote.trim()) {
      setCheckoutError("Identifica a la persona o agrega una nota para registrar el pago pendiente.");
      window.requestAnimationFrame(() => debtNoteRef.current?.focus());
      return;
    }
    if (paymentMethod === "colaborador" && !debtorCollaborator) {
      setCheckoutError("Selecciona al colaborador que retira los productos.");
      window.requestAnimationFrame(() => debtorCollaboratorRef.current?.focus());
      return;
    }

    setSubmitting(true);
    setCheckoutError("");

    try {
      const authoritativeState = await loadPos();
      const sessionForSale = authoritativeState?.activeSession ?? null;
      if (!sessionForSale) {
        setPendingSaleId(null);
        setCheckoutError(
          "El turno activo se cerró o cambió. Abre un turno vigente para registrar ventas.",
        );
        setOpeningDismissed(false);
        return;
      }

      const saleId = sessionForSale.id === activeSession.id && pendingSaleId
        ? pendingSaleId
        : crypto.randomUUID();
      if (sessionForSale.id !== activeSession.id) {
        setPendingSaleId(null);
        setNotice(
          `Se actualizó al turno activo ${sessionForSale.shift.toUpperCase()} de ${sessionForSale.responsible}.`,
        );
      }
      setPendingSaleId(saleId);

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: saleId,
          paymentMethod,
          debtNote:
            paymentMethod === "pendiente" || paymentMethod === "colaborador"
              ? debtNote.trim() || null
              : null,
          debtorCollaborator:
            paymentMethod === "colaborador" ? debtorCollaborator : null,
          sessionId: sessionForSale.id,
          seller: sessionForSale.responsible,
          shift: sessionForSale.shift,
          items: cartLines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            unitPriceClp: line.product.priceClp,
          })),
        }),
      });
      const payload = await readJson<{ sale: Sale }>(response);
      setCart({});
      setPaymentMethod("");
      setDebtNote("");
      setDebtorCollaborator("");
      setPendingSaleId(null);
      if (payload.sale.paymentStatus === "pending") {
        setDebtsRefreshSignal((current) => current + 1);
      }
      setNotice(
        payload.sale.paymentMethod === "colaborador"
          ? `Consumo de colaborador registrado por ${formatClp(payload.sale.totalClp)}.`
          : payload.sale.paymentStatus === "verification_pending"
            ? `Transferencia registrada por ${formatClp(payload.sale.totalClp)}. Valídala con el correo de Mercado Pago.`
          : payload.sale.paymentStatus === "pending"
            ? `Pago pendiente registrado por ${formatClp(payload.sale.totalClp)}.`
            : `Venta registrada por ${formatClp(payload.sale.totalClp)}.`,
      );
      await loadPos();
      setTodaySalesRefreshSignal((current) => current + 1);
    } catch (error) {
      if (error instanceof HttpResponseError) {
        setPendingSaleId(null);
        if (error.status === 409) {
          const refreshedState = await loadPos();
          if (!refreshedState?.activeSession) setOpeningDismissed(false);
        }
      }
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la venta. Tus productos siguen en el ticket.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function showOpeningDialog(returnFocus?: HTMLElement | null) {
    const dialog = shiftDialogRef.current;
    if (!dialog || activeSession) return;
    openingReturnFocusRef.current = returnFocus ?? catalogTitleRef.current;
    setOpeningDismissed(false);
    if (!dialog.open) dialog.showModal();
    window.requestAnimationFrame(() => openingShiftRef.current?.focus());
  }

  function dismissOpeningDialog() {
    if (opening) return;
    setOpeningDismissed(true);
    shiftDialogRef.current?.close();
    window.requestAnimationFrame(() => openingReturnFocusRef.current?.focus());
  }

  function markOpeningTouched(field: "shift" | "responsible" | "cash") {
    setOpeningTouched((current) => new Set(current).add(field));
  }

  function focusFirstOpeningError() {
    if (!openingShiftValue) return openingShiftRef.current?.focus();
    if (!openingResponsibleValue) return openingResponsibleRef.current?.focus();
    if (openingCash === null) return openingCashRef.current?.focus();
  }

  function switchProfileFromOpening() {
    if (!role || opening) return;
    const url = new URL("/api/auth/switch-profile", window.location.href);
    url.searchParams.set("returnTo", "/");
    window.location.assign(url.toString());
  }

  async function openShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpeningSubmitted(true);
    if (!openingShiftValue || !openingResponsibleValue || openingCash === null) {
      setOpeningError("Revisa los datos obligatorios para abrir el turno.");
      window.requestAnimationFrame(focusFirstOpeningError);
      return;
    }

    const attempt = openingAttempt ?? {
      id: crypto.randomUUID(),
      shift: openingShiftValue,
      responsible: openingResponsibleValue,
      openingCashClp: openingCash,
    };
    setOpeningAttempt(attempt);
    setOpening(true);
    setOpeningError("");

    try {
      const response = await fetch("/api/shift-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(attempt),
      });
      const payload = await readJson<{ session: ShiftSession; idempotent: boolean }>(response);
      const authoritativeState = await loadPos();
      if (!authoritativeState) {
        throw new Error("La apertura fue recibida, pero no pudimos confirmar el estado. Reintenta para comprobarla sin duplicar el turno.");
      }
      setOpeningAttempt(null);
      setOpeningShift("");
      setOpeningResponsible("");
      setOpeningCashClp("");
      setOpeningSubmitted(false);
      setOpeningTouched(new Set());
      const confirmedSession = authoritativeState.activeSession;
      setOpeningDismissed(false);
      setNotice(
        confirmedSession?.status === "open"
          ? confirmedSession.id === payload.session.id
            ? `Turno ${confirmedSession.shift.toUpperCase()} abierto con ${confirmedSession.responsible}.`
            : `Se recuperó el turno activo ${confirmedSession.shift.toUpperCase()} de ${confirmedSession.responsible}.`
          : "La apertura se recuperó, pero ese turno ya estaba cerrado. Abre el turno vigente para continuar.",
      );
    } catch (error) {
      if (error instanceof HttpResponseError) {
        if (error.status >= 400 && error.status < 500) setOpeningAttempt(null);
        if (error.status === 409) await loadPos();
      }
      setOpeningError(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el turno. Reintenta con los mismos datos.",
      );
    } finally {
      setOpening(false);
    }
  }

  async function saveIngredientStock(
    event: FormEvent<HTMLFormElement>,
    ingredient: Ingredient,
  ) {
    event.preventDefault();
    const stockDraft = ingredientDrafts[ingredient.id] ?? "";
    const nextStock = Number(stockDraft);
    if (!stockDraft.trim() || !Number.isSafeInteger(nextStock) || nextStock < 0) {
      setIngredientErrors((current) => ({
        ...current,
        [ingredient.id]: "Ingresa un stock entero igual o mayor que cero.",
      }));
      return;
    }
    if (nextStock === ingredient.stock) return;

    let staleRevision = false;
    setSavingIngredientId(ingredient.id);
    setIngredientErrors((current) => ({ ...current, [ingredient.id]: "" }));
    setIngredients((current) =>
      current.map((item) => item.id === ingredient.id ? { ...item, stock: nextStock } : item),
    );

    try {
      const response = await fetch(`/api/ingredients/${encodeURIComponent(ingredient.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stock: nextStock, expectedRevision: ingredient.revision }),
      });
      staleRevision = response.status === 409;
      const payload = await readJson<{ ingredient: Ingredient }>(response);
      setIngredients((current) =>
        current.map((item) => item.id === ingredient.id ? payload.ingredient : item),
      );
      setIngredientDrafts((current) => ({
        ...current,
        [ingredient.id]: String(payload.ingredient.stock),
      }));
      setNotice(`Stock de ${payload.ingredient.name} actualizado.`);
      await Promise.all([loadPos(), loadManagedProducts()]);
    } catch (error) {
      setIngredients((current) =>
        current.map((item) => item.id === ingredient.id ? ingredient : item),
      );
      if (staleRevision) {
        await loadIngredients({ preserveDrafts: true, resetIngredientId: ingredient.id });
      }
      setIngredientErrors((current) => ({
        ...current,
        [ingredient.id]: error instanceof Error ? error.message : "No se pudo actualizar el insumo.",
      }));
    } finally {
      setSavingIngredientId(null);
    }
  }

  function openManager() {
    if (!isAdmin) return;
    setManagerView("stock-entry");
    setStockEntryReviewing(false);
    if (!stockEntryAttempt) setStockEntryError("");
    setStockEntrySuccess(null);
    setManagerOpen(true);
    void Promise.all([loadManagedProducts(), loadIngredients()]);
  }

  function closeManager() {
    if (stockEntryAttempt) {
      setManagerView("stock-entry");
      setStockEntryError(
        "Primero reintenta este mismo ingreso para confirmar el resultado sin riesgo de duplicarlo.",
      );
      return;
    }
    setManagerOpen(false);
    setEditingProductId(null);
    setEditingProductUpdatedAt(null);
    setProductForm(EMPTY_PRODUCT_FORM);
    setManagerView("stock-entry");
    setManagerError("");
    setIngredientsError("");
    setIngredientErrors({});
    setStockEntryTarget("");
    setStockEntryLocation("");
    setStockEntryQuantity("");
    setStockEntryReviewing(false);
    setStockEntryAttempt(null);
    persistStockEntryAttempt(null);
    setStockEntryError("");
    setStockEntrySuccess(null);
  }

  function startStockEntry(options: {
    kind?: StockEntryTargetKind;
    id?: string;
  } = {}) {
    setManagerView("stock-entry");
    setEditingProductId(null);
    setEditingProductUpdatedAt(null);
    setProductForm(EMPTY_PRODUCT_FORM);
    setManagerError("");
    setStockEntryReviewing(false);
    setStockEntryAttempt(null);
    persistStockEntryAttempt(null);
    setStockEntryError("");
    setStockEntrySuccess(null);

    if (options.kind && options.id) {
      setStockEntryTarget(stockEntryTargetValue(options.kind, options.id));
      if (options.kind === "ingredient") {
        setStockEntryLocation("");
      } else {
        const product = managedProducts.find((item) => item.id === options.id);
        setStockEntryLocation(product?.stockMode === "simple" ? "simple" : "");
      }
    }

    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
      editorTitleRef.current?.focus({ preventScroll: true });
      stockEntryTargetRef.current?.focus({ preventScroll: true });
    });
  }

  function changeStockEntryTarget(value: string) {
    const target = parseStockEntryTarget(value);
    const product = target?.kind === "product"
      ? managedProducts.find((item) => item.id === target.id)
      : null;
    setStockEntryTarget(value);
    setStockEntryLocation(product?.stockMode === "simple" ? "simple" : "");
    setStockEntryReviewing(false);
    setStockEntryError("");
    setStockEntrySuccess(null);
  }

  function changeStockEntryLocation(value: StockEntryLocation | "") {
    setStockEntryLocation(value);
    setStockEntryReviewing(false);
    setStockEntryError("");
    setStockEntrySuccess(null);
  }

  function changeStockEntryQuantity(value: string) {
    setStockEntryQuantity(value);
    setStockEntryReviewing(false);
    setStockEntryError("");
    setStockEntrySuccess(null);
  }

  async function saveStockEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockEntryAttempt) {
      if (!stockEntryFormValid || !parsedStockEntryTarget || stockEntryCurrentQuantity === null) {
        setStockEntryError(
          !parsedStockEntryTarget
            ? "Selecciona el producto o insumo recibido."
            : !stockEntryLocationValid
              ? "Selecciona dónde ingresó el stock."
              : `La cantidad debe ser un entero entre 1 y ${MAX_STOCK_ENTRY_QUANTITY.toLocaleString("es-CL")}.`,
        );
        return;
      }

      if (!stockEntryReviewing) {
        setStockEntryReviewing(true);
        setStockEntryError("");
        return;
      }
    }

    const attempt = stockEntryAttempt ?? {
      id: crypto.randomUUID(),
      targetKind: parsedStockEntryTarget!.kind,
      targetId: parsedStockEntryTarget!.id,
      location: parsedStockEntryTarget!.kind === "product"
        ? stockEntryLocation as StockEntryLocation
        : null,
      quantity: stockEntryQuantityNumber,
    };
    setStockEntryAttempt(attempt);
    persistStockEntryAttempt(attempt);
    setStockEntrySaving(true);
    setStockEntryError("");

    try {
      const endpoint = attempt.targetKind === "product"
        ? `/api/products/${encodeURIComponent(attempt.targetId)}/stock-entry`
        : `/api/ingredients/${encodeURIComponent(attempt.targetId)}/stock-entry`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: attempt.id,
          quantity: attempt.quantity,
          ...(attempt.location ? { location: attempt.location } : {}),
        }),
      });
      const payload = await readJson<{
        entry: InventoryStockEntry;
        product?: Product;
        ingredient?: Ingredient;
        idempotent: boolean;
      }>(response);

      if (payload.product) {
        setManagedProducts((current) =>
          current.map((product) => product.id === payload.product!.id ? payload.product! : product),
        );
        setData((current) => current ? {
          ...current,
          products: current.products.map((product) =>
            product.id === payload.product!.id ? payload.product! : product,
          ),
        } : current);
      }
      if (payload.ingredient) {
        setIngredients((current) =>
          current.map((ingredient) =>
            ingredient.id === payload.ingredient!.id ? payload.ingredient! : ingredient,
          ),
        );
        setIngredientDrafts((current) => ({
          ...current,
          [payload.ingredient!.id]: String(payload.ingredient!.stock),
        }));
      }
      setStockEntrySuccess(payload.entry);
      setStockEntryQuantity("");
      setStockEntryReviewing(false);
      setStockEntryAttempt(null);
      persistStockEntryAttempt(null);
      setNotice(
        `${payload.entry.itemName}: ${payload.entry.quantityBefore} + ${payload.entry.quantityAdded} = ${payload.entry.quantityAfter}.`,
      );
      await Promise.all([loadManagedProducts(), loadIngredients(), loadPos()]);
    } catch (error) {
      const canSafelyCreateAnotherAttempt =
        error instanceof HttpResponseError && error.status >= 400 && error.status < 500;
      if (canSafelyCreateAnotherAttempt) {
        setStockEntryAttempt(null);
        persistStockEntryAttempt(null);
        setStockEntryReviewing(false);
      }
      setStockEntryError(
        error instanceof HttpResponseError
          ? error.message
          : "No pudimos confirmar el ingreso. Reintenta el mismo intento para comprobarlo sin sumar dos veces.",
      );
    } finally {
      setStockEntrySaving(false);
    }
  }

  function startEditProduct(product: Product, options: { focusEditor?: boolean } = {}) {
    setManagerView("product");
    setStockEntryReviewing(false);
    setStockEntryError("");
    setStockEntrySuccess(null);
    setEditingProductId(product.id);
    setEditingProductUpdatedAt(product.updatedAt);
    setProductForm({
      sku: product.sku ?? "",
      name: product.name,
      category: product.category,
      priceClp: String(product.priceClp),
      stockMode: product.stockMode,
      stock: product.stock === null ? "" : String(product.stock),
      stockVitrina: product.stockVitrina === null ? "" : String(product.stockVitrina),
      stockBodega: product.stockBodega === null ? "" : String(product.stockBodega),
      active: product.active,
      needsPriceReview: product.needsPriceReview,
    });
    setManagerError("");
    if (options.focusEditor !== false && window.matchMedia("(max-width: 880px)").matches) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      window.requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({ behavior, block: "start" });
        editorTitleRef.current?.focus({ preventScroll: true });
      });
    }
  }

  function resetProductForm() {
    setManagerView("product");
    setStockEntryReviewing(false);
    setStockEntryError("");
    setStockEntrySuccess(null);
    setEditingProductId(null);
    setEditingProductUpdatedAt(null);
    setProductForm(EMPTY_PRODUCT_FORM);
    setManagerError("");
  }

  function changeStockMode(stockMode: StockMode) {
    setProductForm((current) => {
      if (stockMode === current.stockMode) return current;
      if (stockMode === "split") {
        return {
          ...current,
          stockMode,
          stockVitrina: current.stockMode === "simple" ? current.stock : current.stockVitrina,
          stockBodega: current.stockMode === "simple" ? "0" : current.stockBodega,
        };
      }
      if (stockMode === "simple") {
        const splitTotal =
          (Number(current.stockVitrina) || 0) + (Number(current.stockBodega) || 0);
        return {
          ...current,
          stockMode,
          stock: current.stockMode === "split" ? String(splitTotal) : current.stock,
        };
      }
      return { ...current, stockMode };
    });
    setManagerError("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceClp = Number(productForm.priceClp);
    const category = productForm.category.trim();
    const stock = productForm.stockMode === "simple" ? Number(productForm.stock) : null;
    const stockVitrina = productForm.stockMode === "split" ? Number(productForm.stockVitrina) : null;
    const stockBodega = productForm.stockMode === "split" ? Number(productForm.stockBodega) : null;

    if (!productForm.name.trim() || !category) {
      setManagerError("Nombre y categoría son obligatorios.");
      return;
    }
    if (!Number.isInteger(priceClp) || priceClp <= 0) {
      setManagerError("El precio debe ser un número entero mayor que cero.");
      return;
    }
    if (editingProductId && !editingProductUpdatedAt) {
      setManagerError("Actualiza el catálogo antes de editar este producto.");
      return;
    }
    if (editingProductUsesIngredients && productForm.stockMode !== "untracked") {
      setManagerError(
        "Este producto descuenta insumos de su receta. Ajusta sus porciones en la sección Insumos.",
      );
      return;
    }
    if (
      productForm.stockMode === "simple" &&
      (!productForm.stock.trim() || !Number.isInteger(stock) || Number(stock) < 0)
    ) {
      setManagerError("El stock debe ser un número entero igual o mayor que cero.");
      return;
    }
    if (
      productForm.stockMode === "split" &&
      (!productForm.stockVitrina.trim() ||
        !productForm.stockBodega.trim() ||
        !Number.isInteger(stockVitrina) ||
        Number(stockVitrina) < 0 ||
        !Number.isInteger(stockBodega) ||
        Number(stockBodega) < 0)
    ) {
      setManagerError("El stock de vitrina y bodega debe usar números enteros iguales o mayores que cero.");
      return;
    }

    setSavingProduct(true);
    setManagerError("");
    let staleProduct = false;
    try {
      const endpoint = editingProductId ? `/api/products/${editingProductId}` : "/api/products";
      const response = await fetch(endpoint, {
        method: editingProductId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: productForm.sku.trim() || null,
          name: productForm.name.trim(),
          category,
          priceClp,
          stockMode: productForm.stockMode,
          stock,
          stockVitrina,
          stockBodega,
          active: productForm.active,
          needsPriceReview: productForm.needsPriceReview,
          ...(editingProductId ? { expectedUpdatedAt: editingProductUpdatedAt } : {}),
        }),
      });
      staleProduct = response.status === 409;
      const payload = await readJson<{ product: Product }>(response);
      setNotice(`${payload.product.name} quedó guardado en el catálogo.`);
      resetProductForm();
      await Promise.all([loadManagedProducts(), loadPos()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el producto.";
      if (staleProduct && editingProductId) {
        const [freshProducts] = await Promise.all([loadManagedProducts(), loadPos()]);
        const freshProduct = freshProducts?.find((product) => product.id === editingProductId);
        if (freshProduct) {
          startEditProduct(freshProduct, { focusEditor: false });
          setManagerError(
            `${message} Recargamos la versión vigente; los productos del ticket siguen seleccionados.`,
          );
        } else {
          setManagerError(
            `${message} No pudimos recargar el producto; los productos del ticket siguen seleccionados.`,
          );
        }
      } else {
        setManagerError(message);
      }
    } finally {
      setSavingProduct(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Ir al contenido principal</a>
      <main className="pos-shell" id="main-content">
        <AppShellHeader
          role={role}
          activeSession={activeSession}
          currentSection="sales"
          onManageProducts={openManager}
        />

        <div className="page-content">
          {loadError ? (
            <div className="page-alert" role="alert">
              <div>
                <strong>No pudimos cargar la caja</strong>
                <span>{loadError}</span>
              </div>
              <button type="button" onClick={() => void loadPos()}>Reintentar</button>
            </div>
          ) : null}

          {activeSession ? (
            <section className="active-shift-summary" aria-labelledby="active-shift-summary-title">
              <header className="active-shift-summary-heading">
                <div>
                  <p className="eyebrow">Resumen del turno</p>
                  <h2 id="active-shift-summary-title">
                    Turno {activeSession.shift.toUpperCase()} · {activeSession.responsible}
                  </h2>
                </div>
                <div className="active-shift-summary-actions">
                  <span>Ventas y abonos del turno</span>
                  <button className="quiet-button" type="button" onClick={() => void refreshShiftSummary()} disabled={refreshingShiftSummary}>
                    {refreshingShiftSummary ? "Actualizando…" : "Actualizar"}
                  </button>
                </div>
              </header>
              {activeShiftSummary ? (
                <div className="active-shift-summary-content">
                  <dl className="active-shift-sales-total">
                    <div>
                      <dt>Ventas incluidas</dt>
                      <dd>{formatClp(activeShiftSummary.includedSalesClp)}</dd>
                      <small>
                        {activeShiftSummary.includedSalesCount} {activeShiftSummary.includedSalesCount === 1 ? "venta" : "ventas"}; puede incluir pendientes de clientes.
                      </small>
                    </div>
                  </dl>
                  <section className="active-shift-received" aria-labelledby="active-shift-received-title">
                    <h3 id="active-shift-received-title">Dinero recibido en este turno</h3>
                    <dl>
                      <div><dt>Efectivo</dt><dd>{formatClp(activeShiftSummary.cashCollectedClp)}</dd></div>
                      <div><dt>Tarjeta</dt><dd>{formatClp(activeShiftSummary.cardCollectedClp)}</dd></div>
                      <div><dt>Transferencia</dt><dd>{formatClp(activeShiftSummary.transferCollectedClp)}</dd></div>
                      <div><dt>Abonos cobrados</dt><dd>{formatClp(activeShiftSummary.settlementCollectedClp)}</dd></div>
                      <div className="active-shift-received-total"><dt>Total recibido</dt><dd>{formatClp(activeShiftSummary.totalCollectedClp)}</dd></div>
                    </dl>
                    <p>
                      Incluye abonos de clientes y colaboradores. Los consumos pendientes de colaboradores siguen fuera de caja.
                    </p>
                  </section>
                </div>
              ) : (
                <div className="active-shift-summary-loading" role="status">
                  <span>No pudimos sincronizar el resumen del turno.</span>
                  <button className="quiet-button" type="button" onClick={() => void refreshShiftSummary()} disabled={refreshingShiftSummary}>
                    {refreshingShiftSummary ? "Actualizando…" : "Actualizar"}
                  </button>
                </div>
              )}
            </section>
          ) : null}

          <div className="workspace">
            <section className="catalog" aria-labelledby="catalog-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Nueva venta</p>
                  <h2 id="catalog-title" ref={catalogTitleRef} tabIndex={-1}>Selecciona productos</h2>
                </div>
                <label className="search-field">
                  <span>Buscar</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nombre o SKU"
                  />
                </label>
              </div>

              {products.some((product) => product.needsPriceReview) ? (
                <div className="catalog-warning">
                  <strong>Catálogo inicial de muestra.</strong>
                  <span>Revisa los precios señalados antes de comenzar la operación real.</span>
                </div>
              ) : null}

              <div className="category-tabs" aria-label="Categorías de productos">
                {categories.map((item) => (
                  <button
                    className={`category-tab ${category === item ? "active" : ""}`}
                    type="button"
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {!data ? (
                <div className="product-grid" aria-label="Cargando productos">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div className="product-card product-card-loading" key={index} />
                  ))}
                </div>
              ) : filteredProducts.length ? (
                <div className="product-grid">
                  {filteredProducts.map((product) => {
                    const available = availableStock(product);
                    const usedByGroup = cartStockGroupQuantity(cart, product, products);
                    const groupLimit = cartStockGroupLimit(cart, product, products);
                    const limitReachedInCart =
                      available !== 0 && groupLimit !== null && usedByGroup >= groupLimit;
                    const soldOut = available === 0 || limitReachedInCart;
                    const cardCopy = productCardCopy(product);
                    const stockCopy = limitReachedInCart
                      ? "Máximo en el ticket"
                      : productStockLabel(product);
                    return (
                      <button
                        className="product-card"
                        type="button"
                        onClick={() => addProduct(product)}
                        disabled={soldOut || !activeSession}
                        aria-label={
                          !activeSession
                            ? `${product.name}, ${formatClp(product.priceClp)}. Abre un turno para agregarlo.`
                            : soldOut
                            ? `${product.name}, ${formatClp(product.priceClp)}, no disponible: ${stockCopy}`
                            : `Agregar ${product.name}, ${formatClp(product.priceClp)}, ${stockCopy}`
                        }
                        key={product.id}
                      >
                        <span className={`product-swatch ${categoryTone(product.category)}`} aria-hidden="true">
                          {product.name.slice(0, 2).toLocaleUpperCase("es")}
                        </span>
                        <span className="product-info">
                          <strong>{cardCopy.title}</strong>
                          <small>{cardCopy.detail}</small>
                        </span>
                        <span className="product-price">{formatClp(product.priceClp)}</span>
                        <span className={`stock-label ${soldOut ? "stock-empty" : ""}`}>
                          {stockCopy}
                        </span>
                        {product.needsPriceReview ? <span className="review-badge">Revisar precio</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="catalog-empty">
                  <strong>No encontramos productos</strong>
                  <span>Prueba con otra búsqueda o categoría.</span>
                </div>
              )}
            </section>

            <aside className="sale-panel" aria-labelledby="sale-title" aria-busy={submitting}>
              <div className="sale-panel-header">
                <div>
                  <p className="eyebrow">Venta actual</p>
                  <h2 id="sale-title">Ticket en curso</h2>
                </div>
                <button className="text-button" type="button" onClick={clearSale} disabled={!cartUnits}>
                  Limpiar
                </button>
              </div>

              <div className="cart-items" aria-live="polite">
                {cartLines.length ? (
                  cartLines.map(({ product, quantity, lineTotalClp }) => {
                    const usedByGroup = cartStockGroupQuantity(cart, product, products);
                    const groupLimit = cartStockGroupLimit(cart, product, products);
                    const cannotIncrease = quantity >= 99 || (groupLimit !== null && usedByGroup >= groupLimit);
                    return (
                      <div className="cart-line" key={product.id}>
                        <div className="cart-product-copy">
                          <strong>{product.name}</strong>
                          <span>{quantity} × {formatClp(product.priceClp)}</span>
                        </div>
                        <strong className="cart-line-total">{formatClp(lineTotalClp)}</strong>
                        <div className="quantity-control" aria-label={`Cantidad de ${product.name}`}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product, quantity - 1)}
                            aria-label={`Quitar una unidad de ${product.name}`}
                          >
                            −
                          </button>
                          <span aria-label={`${quantity} unidades`}>{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product, quantity + 1)}
                            disabled={cannotIncrease}
                            aria-label={`Agregar una unidad de ${product.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="cart-empty">
                    <span className="empty-mark" aria-hidden="true">+</span>
                    <strong>Tu ticket está vacío</strong>
                    <p>Selecciona productos para comenzar una venta.</p>
                  </div>
                )}
              </div>

              <div className="checkout-fields">
                <section
                  className={`sale-context-card ${activeSession ? "sale-context-card-open" : "sale-context-card-closed"}`}
                  aria-labelledby="sale-context-title"
                >
                  <div className="sale-context-heading">
                    <span id="sale-context-title">Turno y responsable</span>
                    <strong>{activeSession ? "Bloqueado" : "Requiere apertura"}</strong>
                  </div>
                  {activeSession ? (
                    <>
                      <dl className="sale-context-details">
                        <div>
                          <dt>Turno</dt>
                          <dd>{activeSession.shift.toUpperCase()}</dd>
                        </div>
                        <div>
                          <dt>Responsable</dt>
                          <dd>{activeSession.responsible}</dd>
                        </div>
                      </dl>
                      <p>Asignación fija hasta cerrar y entregar el turno.</p>
                    </>
                  ) : (
                    <div className="sale-context-empty" role="status">
                      <p>No hay un turno abierto. Abre un turno antes de cobrar.</p>
                      <button className="sale-context-link" type="button" onClick={(event) => showOpeningDialog(event.currentTarget)}>
                        Abrir turno aquí
                      </button>
                    </div>
                  )}
                </section>

                <fieldset
                  className="payment-fieldset"
                  aria-describedby={checkoutError ? "checkout-error" : undefined}
                >
                  <legend>Medio de pago</legend>
                  <div className="payment-options">
                    {PAYMENT_METHODS.map((method, index) => (
                      <label
                        className={`payment-option payment-option-${method.value} ${paymentMethod === method.value ? "selected" : ""}`}
                        key={method.value}
                      >
                        <input
                          ref={index === 0 ? paymentMethodRef : undefined}
                          type="radio"
                          name="payment-method"
                          value={method.value}
                          checked={paymentMethod === method.value}
                          onChange={() => {
                            setPaymentMethod(method.value);
                            setCheckoutError("");
                            setPendingSaleId(null);
                          }}
                        />
                        <span>{method.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {paymentMethod === "pendiente" ? (
                  <label className="debt-note-field">
                    <span>Persona o nota <small>Obligatorio</small></span>
                    <input
                      ref={debtNoteRef}
                      value={debtNote}
                      onChange={(event) => {
                        setDebtNote(event.target.value);
                        setCheckoutError("");
                        setPendingSaleId(null);
                      }}
                      aria-invalid={!debtNote.trim() && Boolean(checkoutError)}
                      aria-describedby={checkoutError ? "debt-note-help checkout-error" : "debt-note-help"}
                      maxLength={500}
                      placeholder="Ej. Juan Pérez — paga mañana"
                    />
                    <small id="debt-note-help">Identifica quién debe pagar o deja el acuerdo de cobro.</small>
                  </label>
                ) : null}

                {paymentMethod === "colaborador" ? (
                  <div className="collaborator-payment-fields">
                    <label className="context-field">
                      <span>Colaborador que retira <small>Obligatorio</small></span>
                      <select
                        ref={debtorCollaboratorRef}
                        value={debtorCollaborator}
                        onChange={(event) => {
                          setDebtorCollaborator(event.target.value as Collaborator | "");
                          setCheckoutError("");
                          setPendingSaleId(null);
                        }}
                        aria-invalid={!debtorCollaborator && Boolean(checkoutError)}
                        aria-describedby={checkoutError ? "checkout-error" : undefined}
                        required
                      >
                        <option value="">Seleccionar</option>
                        {COLLABORATORS.map((collaborator) => (
                          <option value={collaborator} key={collaborator}>{collaborator}</option>
                        ))}
                      </select>
                    </label>
                    <label className="debt-note-field debt-note-field-collaborator">
                      <span>Nota <small>Opcional</small></span>
                      <input
                        value={debtNote}
                        onChange={(event) => {
                          setDebtNote(event.target.value);
                          setCheckoutError("");
                          setPendingSaleId(null);
                        }}
                        maxLength={500}
                        placeholder="Ej. Descontar a fin de mes"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              {checkoutError ? <p className="checkout-error" id="checkout-error" role="alert">{checkoutError}</p> : null}

              <div className="totals">
                <span>{cartUnits} {cartUnits === 1 ? "unidad" : "unidades"}</span>
                <strong>Total <b>{formatClp(cartTotal)}</b></strong>
              </div>
              <button
                className="checkout-button"
                type="button"
                onClick={() => activeSession ? void submitSale() : showOpeningDialog()}
                disabled={submitting || !cartLines.length}
              >
                {submitting
                  ? "Registrando venta…"
                  : !activeSession
                    ? "Abre un turno para registrar ventas"
                  : paymentMethod === "pendiente"
                    ? `Registrar como pendiente · ${formatClp(cartTotal)}`
                    : paymentMethod === "colaborador"
                      ? `Registrar a colaborador · ${formatClp(cartTotal)}`
                      : paymentMethod === "transferencia"
                        ? `Registrar transferencia por validar · ${formatClp(cartTotal)}`
                      : `Registrar venta · ${formatClp(cartTotal)}`}
              </button>
            </aside>
          </div>

          {role ? (
            <TodaySalesPanel
              refreshSignal={todaySalesRefreshSignal}
              activeSessionId={activeSession?.id ?? null}
              activityRevision={activeShiftSummary?.activityRevision ?? null}
              onSaleVoided={async (message) => {
                if (message) setNotice(message);
                setDebtsRefreshSignal((current) => current + 1);
                await loadPos();
              }}
              onTransferValidated={async (message) => {
                if (message) setNotice(message);
                await loadPos();
              }}
            />
          ) : null}

          {role ? (
            <DebtsPanel
              role={role}
              activeSession={activeSession}
              refreshSignal={debtsRefreshSignal}
              onPaymentRegistered={async (message) => {
                if (message) setNotice(message);
                await loadPos();
                setTodaySalesRefreshSignal((current) => current + 1);
              }}
            />
          ) : null}
        </div>
      </main>

      {notice ? <div className="toast" role="status">{notice}</div> : null}

      <dialog
        className="shift-opening-dialog"
        ref={shiftDialogRef}
        onCancel={(event) => {
          event.preventDefault();
          dismissOpeningDialog();
        }}
        aria-labelledby="shift-opening-dialog-title"
        aria-describedby="shift-opening-dialog-description"
      >
        <div className="shift-opening-modal-shell">
          <header className="shift-opening-modal-header">
            <span className="shift-opening-modal-mark" aria-hidden="true">DG</span>
            <div>
              <p className="eyebrow">Inicio de operación</p>
              <h2 id="shift-opening-dialog-title">Abre el turno para vender</h2>
              <p id="shift-opening-dialog-description">
                El catálogo está disponible detrás, pero queda protegido hasta asignar el turno y
                su responsable.
              </p>
            </div>
          </header>

          <form className="shift-opening-modal-form" onSubmit={openShift} aria-busy={opening} noValidate>
            <div className="shift-opening-modal-fields">
              <label className="cash-field">
                <span>Turno <small>Obligatorio</small></span>
                <select
                  ref={openingShiftRef}
                  value={openingShiftValue}
                  onChange={(event) => {
                    setOpeningShift(event.target.value as Shift | "");
                    setOpeningAttempt(null);
                    setOpeningError("");
                  }}
                  onBlur={() => markOpeningTouched("shift")}
                  disabled={opening || Boolean(openingAttempt)}
                  aria-invalid={(openingSubmitted || openingTouched.has("shift")) && !openingShiftValue}
                  aria-describedby={(openingSubmitted || openingTouched.has("shift")) && !openingShiftValue ? "opening-shift-error" : undefined}
                  required
                >
                  <option value="">Seleccionar</option>
                  {SHIFTS.map((shift) => (
                    <option value={shift} key={shift}>Turno {shift.toUpperCase()}</option>
                  ))}
                </select>
                {(openingSubmitted || openingTouched.has("shift")) && !openingShiftValue ? (
                  <small className="field-error" id="opening-shift-error" role="alert">Selecciona AM o PM.</small>
                ) : null}
              </label>

              <label className="cash-field shift-opening-responsible-field">
                <span>Responsable <small>Obligatorio</small></span>
                <select
                  ref={openingResponsibleRef}
                  value={openingResponsibleValue}
                  onChange={(event) => {
                    setOpeningResponsible(event.target.value as Collaborator | "");
                    setOpeningAttempt(null);
                    setOpeningError("");
                  }}
                  onBlur={() => markOpeningTouched("responsible")}
                  disabled={opening || Boolean(openingAttempt)}
                  aria-invalid={(openingSubmitted || openingTouched.has("responsible")) && !openingResponsibleValue}
                  aria-describedby={(openingSubmitted || openingTouched.has("responsible")) && !openingResponsibleValue ? "opening-responsible-error" : undefined}
                  required
                >
                  <option value="">Seleccionar</option>
                  {COLLABORATORS.map((person) => (
                    <option value={person} key={person}>{person}</option>
                  ))}
                </select>
                {(openingSubmitted || openingTouched.has("responsible")) && !openingResponsibleValue ? (
                  <small className="field-error" id="opening-responsible-error" role="alert">Selecciona quién recibe la caja.</small>
                ) : null}
              </label>

              <label className="cash-field">
                <span>Fondo inicial <small>Obligatorio</small></span>
                <input
                  ref={openingCashRef}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={openingCashValue}
                  onChange={(event) => {
                    setOpeningCashClp(event.target.value);
                    setOpeningAttempt(null);
                    setOpeningError("");
                  }}
                  onBlur={() => markOpeningTouched("cash")}
                  disabled={opening || Boolean(openingAttempt)}
                  placeholder="0"
                  aria-invalid={(openingSubmitted || openingTouched.has("cash")) && openingCash === null}
                  aria-describedby={(openingSubmitted || openingTouched.has("cash")) && openingCash === null ? "opening-cash-error opening-cash-help" : "opening-cash-help"}
                  required
                />
                <small id="opening-cash-help">Efectivo recibido al iniciar; puede ser $0.</small>
                {(openingSubmitted || openingTouched.has("cash")) && openingCash === null ? (
                  <small className="field-error" id="opening-cash-error" role="alert">Ingresa un monto entero igual o mayor que cero.</small>
                ) : null}
              </label>
            </div>

            {openingAttempt && !opening ? (
              <p className="shift-opening-retry-note" role="status">
                La respuesta no fue concluyente. Reintenta para confirmar la misma apertura sin duplicarla.
              </p>
            ) : null}
            {openingError ? <p className="cash-form-error" role="alert">{openingError}</p> : null}

            <div className="shift-opening-modal-actions">
              <button
                className="quiet-button shift-opening-dismiss-button"
                type="button"
                onClick={dismissOpeningDialog}
                disabled={opening}
              >
                Ahora no
              </button>
              <button
                className="quiet-button shift-opening-profile-button"
                type="button"
                onClick={switchProfileFromOpening}
                disabled={!role || opening}
              >
                {role === "admin"
                  ? "Cambiar a Ventas"
                  : role === "sales"
                    ? "Cambiar a Admin"
                    : "Cambiar perfil"}
              </button>
              <button className="open-shift-button" type="submit" disabled={opening}>
                {opening
                  ? "Abriendo turno…"
                  : openingAttempt
                    ? "Reintentar apertura"
                    : "Abrir turno y comenzar"}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {isAdmin ? (
        <dialog
          className="product-dialog"
          ref={dialogRef}
          onClose={() => setManagerOpen(false)}
          onCancel={(event) => {
            event.preventDefault();
            closeManager();
          }}
          aria-labelledby="product-dialog-title"
        >
        <div className="dialog-shell">
          <header className="dialog-header">
            <div>
              <p className="eyebrow">Administración</p>
              <h2 id="product-dialog-title">Inventario y productos</h2>
            </div>
            <button
              className="dialog-close"
              type="button"
              onClick={closeManager}
              aria-label="Cerrar inventario y productos"
              disabled={stockEntrySaving}
            >
              ×
            </button>
          </header>

          <div className="dialog-content">
            <section className="manager-list" aria-labelledby="manager-list-title">
              <div className="manager-section-heading">
                <div>
                  <h3 id="manager-list-title">Productos</h3>
                  <p>Registra mercadería recibida o corrige la configuración del catálogo.</p>
                </div>
                <div className="manager-heading-actions">
                  <button
                    className={`stock-entry-nav-button ${managerView === "stock-entry" ? "selected" : ""}`}
                    type="button"
                    onClick={() => startStockEntry()}
                    aria-pressed={managerView === "stock-entry"}
                    disabled={savingProduct || stockEntrySaving || Boolean(stockEntryAttempt)}
                  >
                    + Ingresar stock
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={resetProductForm}
                    disabled={savingProduct || stockEntrySaving || Boolean(stockEntryAttempt)}
                  >
                    Nuevo producto
                  </button>
                </div>
              </div>

              {managerLoading ? <p className="manager-state">Cargando catálogo…</p> : null}
              {!managerLoading && !managedProducts.length ? (
                <p className="manager-state">Aún no hay productos configurados.</p>
              ) : null}
              <div className="manager-products">
                {managedProducts.map((product) => (
                  <button
                    className={`manager-product ${managerView === "product" && editingProductId === product.id ? "selected" : ""}`}
                    type="button"
                    onClick={() => startEditProduct(product)}
                    aria-pressed={managerView === "product" && editingProductId === product.id}
                    disabled={savingProduct || stockEntrySaving || Boolean(stockEntryAttempt)}
                    key={product.id}
                  >
                    <span className={`mini-swatch ${categoryTone(product.category)}`} aria-hidden="true">
                      {product.name.slice(0, 1).toLocaleUpperCase("es")}
                    </span>
                    <span className="manager-product-copy">
                      <strong>{product.name}</strong>
                      <small>{product.category} · {product.sku || "Sin SKU"}</small>
                    </span>
                    <span className="manager-product-meta">
                      <strong>{formatClp(product.priceClp)}</strong>
                      <small>{managerStockLabel(product)}</small>
                      <small>{product.active ? "Activo" : "Inactivo"}</small>
                    </span>
                  </button>
                ))}
              </div>

              <section className="ingredients-manager" aria-labelledby="ingredients-manager-title">
                <div className="ingredients-heading">
                  <div>
                    <h3 id="ingredients-manager-title">Ajuste manual · Stock compartido</h3>
                    <p>Solo para corregir un conteo. Para mercadería nueva usa “Ingresar stock”.</p>
                  </div>
                  <button
                    className="ingredients-refresh"
                    type="button"
                    onClick={() => void loadIngredients()}
                    disabled={
                      ingredientsLoading ||
                      savingIngredientId !== null ||
                      stockEntrySaving ||
                      Boolean(stockEntryAttempt)
                    }
                  >
                    Actualizar
                  </button>
                </div>

                {ingredientsError ? (
                  <p className="ingredients-error" role="alert">{ingredientsError}</p>
                ) : ingredientsLoading ? (
                  <p className="ingredients-state" role="status">Cargando insumos…</p>
                ) : ingredients.length ? (
                  <div className="ingredients-list">
                    {ingredients.map((ingredient) => {
                      const draft = ingredientDrafts[ingredient.id] ?? String(ingredient.stock);
                      const parsedDraft = Number(draft);
                      const invalidDraft =
                        !draft.trim() || !Number.isSafeInteger(parsedDraft) || parsedDraft < 0;
                      const ingredientError = ingredientErrors[ingredient.id] ?? "";
                      const ingredientValidationMessage = invalidDraft
                        ? "Ingresa un stock entero igual o mayor que cero."
                        : ingredientError;
                      const isSaving = savingIngredientId === ingredient.id;
                      return (
                        <form
                          className="ingredient-row"
                          onSubmit={(event) => void saveIngredientStock(event, ingredient)}
                          aria-busy={isSaving}
                          key={ingredient.id}
                        >
                          <div className="ingredient-copy">
                            <strong>{ingredient.name}</strong>
                            <span>Unidad: {ingredient.unit}</span>
                          </div>
                          <label className="ingredient-stock-field">
                            <span>Nuevo total</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              step="1"
                              value={draft}
                              onChange={(event) => {
                                setIngredientDrafts((current) => ({
                                  ...current,
                                  [ingredient.id]: event.target.value,
                                }));
                                setIngredientErrors((current) => ({ ...current, [ingredient.id]: "" }));
                              }}
                              aria-label={`Stock de ${ingredient.name} en ${ingredient.unit}`}
                              aria-invalid={Boolean(ingredientValidationMessage)}
                              aria-describedby={
                                ingredientValidationMessage ? `ingredient-error-${ingredient.id}` : undefined
                              }
                              disabled={
                                savingIngredientId !== null ||
                                stockEntrySaving ||
                                Boolean(stockEntryAttempt)
                              }
                            />
                          </label>
                          <button
                            className="ingredient-save"
                            type="submit"
                            aria-label={`Reemplazar el stock total de ${ingredient.name}`}
                            disabled={
                              savingIngredientId !== null ||
                              stockEntrySaving ||
                              Boolean(stockEntryAttempt) ||
                              invalidDraft ||
                              parsedDraft === ingredient.stock
                            }
                          >
                            {isSaving ? "Guardando…" : "Reemplazar"}
                          </button>
                          {ingredientValidationMessage ? (
                            <p
                              className="ingredient-error"
                              id={`ingredient-error-${ingredient.id}`}
                              role={ingredientError ? "alert" : undefined}
                            >
                              {ingredientValidationMessage}
                            </p>
                          ) : null}
                        </form>
                      );
                    })}
                  </div>
                ) : (
                  <p className="ingredients-state">No hay insumos configurados.</p>
                )}
              </section>
            </section>

            {managerView === "stock-entry" ? (
              <section className="product-editor stock-entry-editor" aria-labelledby="product-editor-title" ref={editorRef}>
                <div className="editor-heading">
                  <p className="eyebrow">Recepción de mercadería</p>
                  <h3 id="product-editor-title" ref={editorTitleRef} tabIndex={-1}>
                    Ingresar stock recibido
                  </h3>
                  <p>
                    Indica cuánto llegó. El sistema lo sumará al stock vigente sin reemplazarlo.
                  </p>
                </div>

                <form className="stock-entry-form" onSubmit={(event) => void saveStockEntry(event)}>
                  <label>
                    <span>Producto o insumo recibido</span>
                    <select
                      ref={stockEntryTargetRef}
                      required
                      value={stockEntryTarget}
                      onChange={(event) => changeStockEntryTarget(event.target.value)}
                      disabled={stockEntrySaving || Boolean(stockEntryAttempt)}
                    >
                      <option value="">Selecciona una opción</option>
                      {stockEntryProducts.length ? (
                        <optgroup label="Productos con stock propio">
                          {stockEntryProducts.map((product) => (
                            <option value={stockEntryTargetValue("product", product.id)} key={product.id}>
                              {product.name} · {product.category} · {product.sku ? `SKU ${product.sku}` : "Sin SKU"} · {managerStockLabel(product)}{product.active ? "" : " · Inactivo"}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {ingredients.length ? (
                        <optgroup label="Stock compartido e insumos">
                          {ingredients.map((ingredient) => (
                            <option value={stockEntryTargetValue("ingredient", ingredient.id)} key={ingredient.id}>
                              {ingredient.name} · {ingredient.stock} {ingredient.unit}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                    {stockEntryIngredient ? (
                      <small>
                        {(() => {
                          const relatedProducts = managedProducts
                            .filter((product) => product.stockGroup === `ingredient:${stockEntryIngredient.id}`)
                            .map((product) => product.name);
                          return relatedProducts.length
                            ? `Compartido por: ${relatedProducts.join(" y ")}.`
                            : `Unidad de control: ${stockEntryIngredient.unit}.`;
                        })()}
                      </small>
                    ) : stockEntryProduct?.stockMode === "simple" ? (
                      <small>El ingreso se sumará al stock disponible.</small>
                    ) : null}
                  </label>

                  {stockEntryProduct?.stockMode === "split" ? (
                    <fieldset className="stock-entry-location">
                      <legend>¿Dónde quedó la mercadería?</legend>
                      <div>
                        <label className={stockEntryLocation === "vitrina" ? "selected" : ""}>
                          <input
                            type="radio"
                            name="stock-entry-location"
                            value="vitrina"
                            checked={stockEntryLocation === "vitrina"}
                            onChange={() => changeStockEntryLocation("vitrina")}
                            disabled={stockEntrySaving || Boolean(stockEntryAttempt)}
                          />
                          <span>Vitrina <small>{stockEntryProduct.stockVitrina ?? 0} actuales</small></span>
                        </label>
                        <label className={stockEntryLocation === "bodega" ? "selected" : ""}>
                          <input
                            type="radio"
                            name="stock-entry-location"
                            value="bodega"
                            checked={stockEntryLocation === "bodega"}
                            onChange={() => changeStockEntryLocation("bodega")}
                            disabled={stockEntrySaving || Boolean(stockEntryAttempt)}
                          />
                          <span>Bodega <small>{stockEntryProduct.stockBodega ?? 0} actuales</small></span>
                        </label>
                      </div>
                    </fieldset>
                  ) : null}

                  <label>
                    <span>Cantidad recibida ({stockEntryUnit})</span>
                    <input
                      required
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={MAX_STOCK_ENTRY_QUANTITY}
                      step="1"
                      value={stockEntryQuantity}
                      onChange={(event) => changeStockEntryQuantity(event.target.value)}
                      placeholder="Ej. 12"
                      aria-invalid={Boolean(stockEntryQuantity.trim() && !stockEntryQuantityValid)}
                      aria-describedby="stock-entry-quantity-help"
                      disabled={stockEntrySaving || Boolean(stockEntryAttempt)}
                    />
                    <small id="stock-entry-quantity-help">
                      Ingresa solo las {stockEntryUnit} nuevas que llegaron, no el total final.
                    </small>
                  </label>

                  {stockEntryCurrentQuantity !== null ? (
                    <output className="stock-entry-calculation" aria-live="polite">
                      <span>
                        <small>Stock actual</small>
                        <strong>{stockEntryCurrentQuantity}</strong>
                      </span>
                      <b aria-hidden="true">+</b>
                      <span>
                        <small>Ingreso</small>
                        <strong>{stockEntryQuantityValid ? stockEntryQuantityNumber : "—"}</strong>
                      </span>
                      <b aria-hidden="true">=</b>
                      <span className="stock-entry-result">
                        <small>Nuevo total</small>
                        <strong>{stockEntryNewQuantity ?? "—"}</strong>
                      </span>
                      {stockEntryProduct?.stockMode === "split" && stockEntryQuantityValid ? (
                        <em>
                          Total del producto: {(stockEntryProduct.stockVitrina ?? 0) + (stockEntryProduct.stockBodega ?? 0)} → {((stockEntryProduct.stockVitrina ?? 0) + (stockEntryProduct.stockBodega ?? 0) + stockEntryQuantityNumber)}
                        </em>
                      ) : null}
                    </output>
                  ) : null}

                  {stockEntryReviewing && !stockEntryAttempt ? (
                    <div className="stock-entry-confirmation" role="status">
                      <strong>Revisa antes de confirmar</strong>
                      <p>
                        Se sumarán <b>{stockEntryQuantityNumber} {stockEntryUnit}</b> a <b>{stockEntryProduct?.name ?? stockEntryIngredient?.name}</b>
                        {stockEntryProduct?.stockMode === "split"
                          ? ` en ${stockEntryLocation === "vitrina" ? "Vitrina" : "Bodega"}`
                          : ""}. Con la existencia visible, el total pasaría de <b>{stockEntryCurrentQuantity}</b> a <b>{stockEntryNewQuantity}</b>. Al confirmar se sumará sobre el stock vigente.
                      </p>
                    </div>
                  ) : null}

                  {stockEntryAttempt ? (
                    <div className="stock-entry-retry-note" role="status">
                      <strong>Resultado pendiente de confirmar</strong>
                      <p>Reintenta el mismo ingreso: la clave de seguridad evita sumarlo dos veces.</p>
                    </div>
                  ) : null}

                  {stockEntryError ? <p className="manager-error" role="alert">{stockEntryError}</p> : null}

                  {stockEntrySuccess ? (
                    <div className="stock-entry-success" role="status">
                      <strong>Ingreso registrado</strong>
                      <span>
                        {stockEntrySuccess.itemName}: {stockEntrySuccess.quantityBefore} + {stockEntrySuccess.quantityAdded} = {stockEntrySuccess.quantityAfter}
                      </span>
                    </div>
                  ) : null}

                  <div className="editor-actions stock-entry-actions">
                    {!stockEntryAttempt && stockEntryReviewing ? (
                      <button
                        className="quiet-button"
                        type="button"
                        onClick={() => setStockEntryReviewing(false)}
                        disabled={stockEntrySaving}
                      >
                        Modificar datos
                      </button>
                    ) : null}
                    <button
                      className="save-product-button"
                      type="submit"
                      disabled={stockEntrySaving || (!stockEntryAttempt && !stockEntryFormValid)}
                    >
                      {stockEntrySaving
                        ? "Registrando…"
                        : stockEntryAttempt
                          ? "Reintentar mismo ingreso"
                          : stockEntryReviewing
                            ? "Confirmar y sumar"
                            : "Revisar ingreso"}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
            <section className="product-editor" aria-labelledby="product-editor-title" ref={editorRef}>
              <div className="editor-heading">
                <p className="eyebrow">{editingProductId ? "Edición" : "Nuevo"}</p>
                <h3 id="product-editor-title" ref={editorTitleRef} tabIndex={-1}>
                  {editingProductId ? "Editar producto" : "Agregar producto"}
                </h3>
              </div>
              <form onSubmit={saveProduct} className="product-form">
                <label>
                  <span>Nombre</span>
                  <input
                    required
                    value={productForm.name}
                    onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                    maxLength={100}
                    placeholder="Ej. Capuchino"
                  />
                </label>
                <div className="form-row">
                  <label>
                    <span>Categoría</span>
                    <input
                      required
                      list="product-categories"
                      value={productForm.category}
                      onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                      maxLength={60}
                      placeholder="Cafés"
                    />
                    <datalist id="product-categories">
                      {CATEGORY_ORDER.map((item) => <option value={item} key={item} />)}
                    </datalist>
                  </label>
                  <label>
                    <span>SKU <small>Opcional</small></span>
                    <input
                      value={productForm.sku}
                      onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))}
                      maxLength={50}
                      placeholder="CAF-001"
                    />
                  </label>
                </div>
                <label>
                  <span>Precio CLP</span>
                  <input
                    required
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={productForm.priceClp}
                    onChange={(event) => setProductForm((current) => ({ ...current, priceClp: event.target.value }))}
                    placeholder="2490"
                  />
                </label>

                <fieldset className="stock-fieldset">
                  <legend>{editingProductId ? "Ajuste manual de stock" : "Stock inicial"}</legend>
                  {editingProductId && productForm.stockMode !== "untracked" && !editingProductUsesIngredients ? (
                    <p className="manual-stock-warning">
                      Estas cifras reemplazan el total. Para mercadería nueva usa “Ingresar stock”.
                    </p>
                  ) : null}
                  <div className="stock-mode-options">
                    <label className={`stock-mode-option ${productForm.stockMode === "untracked" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="stock-mode"
                        value="untracked"
                        checked={productForm.stockMode === "untracked"}
                        onChange={() => changeStockMode("untracked")}
                      />
                      <span>Sin control</span>
                    </label>
                    <label className={`stock-mode-option ${productForm.stockMode === "simple" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="stock-mode"
                        value="simple"
                        checked={productForm.stockMode === "simple"}
                        onChange={() => changeStockMode("simple")}
                        disabled={editingProductUsesIngredients}
                      />
                      <span>Stock simple</span>
                    </label>
                    <label className={`stock-mode-option stock-mode-option-split ${productForm.stockMode === "split" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="stock-mode"
                        value="split"
                        checked={productForm.stockMode === "split"}
                        onChange={() => changeStockMode("split")}
                        disabled={editingProductUsesIngredients}
                      />
                      <span>Vitrina + bodega</span>
                    </label>
                  </div>

                  {editingProductUsesIngredients ? (
                    <p className="stock-mode-warning">
                      Este producto usa stock compartido. Modifica el insumo correspondiente o registra su ingreso.
                    </p>
                  ) : null}

                  {productForm.stockMode === "simple" ? (
                    <label className="stock-input-field">
                      <span>Stock disponible</span>
                      <input
                        required
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={productForm.stock}
                        onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))}
                        placeholder="0"
                      />
                    </label>
                  ) : null}

                  {productForm.stockMode === "split" ? (
                    <div className="split-stock-fields">
                      <div className="form-row">
                        <label>
                          <span>Vitrina</span>
                          <input
                            required
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={productForm.stockVitrina}
                            onChange={(event) => setProductForm((current) => ({ ...current, stockVitrina: event.target.value }))}
                            placeholder="0"
                          />
                          <small>Las ventas descuentan desde aquí.</small>
                        </label>
                        <label>
                          <span>Bodega</span>
                          <input
                            required
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={productForm.stockBodega}
                            onChange={(event) => setProductForm((current) => ({ ...current, stockBodega: event.target.value }))}
                            placeholder="0"
                          />
                        </label>
                      </div>
                      <output className="split-stock-total" aria-live="polite">
                        Total registrado <strong>{splitStockTotal}</strong>
                      </output>
                    </div>
                  ) : null}
                </fieldset>
                <div className="check-options">
                  <label className="check-option">
                    <input
                      type="checkbox"
                      checked={productForm.active}
                      onChange={(event) => setProductForm((current) => ({ ...current, active: event.target.checked }))}
                    />
                    <span>Producto activo y visible en caja</span>
                  </label>
                  <label className="check-option">
                    <input
                      type="checkbox"
                      checked={productForm.needsPriceReview}
                      onChange={(event) => setProductForm((current) => ({ ...current, needsPriceReview: event.target.checked }))}
                    />
                    <span>Precio pendiente de confirmar</span>
                  </label>
                </div>

                {managerError ? <p className="manager-error" role="alert">{managerError}</p> : null}

                <div className="editor-actions">
                  {editingProductId ? (
                    <button className="quiet-button" type="button" onClick={resetProductForm}>Cancelar edición</button>
                  ) : null}
                  <button className="save-product-button" type="submit" disabled={savingProduct}>
                    {savingProduct ? "Guardando…" : editingProductId ? "Guardar cambios" : "Agregar al catálogo"}
                  </button>
                </div>
              </form>
            </section>
            )}
          </div>
        </div>
        </dialog>
      ) : null}
    </>
  );
}
