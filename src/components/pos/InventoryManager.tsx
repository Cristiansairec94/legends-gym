import React, { useState, useMemo } from 'react';
import { useGym } from '../../context/GymContext';
import { Product, ProductCategory } from '../../types';
import {
  Package,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  PackagePlus,
  X,
  Trash2,
  Sparkles,
  Edit3,
  TrendingUp,
  Wallet,
  Boxes,
  ArrowUpDown,
  Download,
  Barcode,
  RotateCcw,
  Filter
} from 'lucide-react';

type StockStatusFilter = 'all' | 'optimal' | 'low' | 'out' | 'scoop';
type SortOption = 'name_asc' | 'stock_asc' | 'stock_desc' | 'margin_desc' | 'price_desc';

const CATEGORY_META: Record<
  ProductCategory,
  { label: string; badgeClass: string; dotClass: string }
> = {
  protein: {
    label: 'Proteínas',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    dotClass: 'bg-amber-400',
  },
  creatine: {
    label: 'Creatinas',
    badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
    dotClass: 'bg-cyan-400',
  },
  preworkout: {
    label: 'Pre-entreno',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    dotClass: 'bg-rose-400',
  },
  aminoacids: {
    label: 'Aminoácidos',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
    dotClass: 'bg-purple-400',
  },
  beverage: {
    label: 'Bebidas',
    badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
    dotClass: 'bg-sky-400',
  },
  snack: {
    label: 'Snacks',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    dotClass: 'bg-emerald-400',
  },
  gear: {
    label: 'Accesorios',
    badgeClass: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    dotClass: 'bg-zinc-400',
  },
};

const ALL_CATEGORIES: ProductCategory[] = [
  'protein',
  'creatine',
  'preworkout',
  'aminoacids',
  'beverage',
  'snack',
  'gear',
];

const ProductThumbnail: React.FC<{ src?: string; alt: string; isOut: boolean }> = ({
  src,
  alt,
  isOut,
}) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative shrink-0">
      {!src || hasError ? (
        <div
          className={`w-12 h-12 rounded-xl bg-gym-surface border flex items-center justify-center ${
            isOut ? 'border-red-500/50 opacity-70' : 'border-gym-border'
          }`}
          title={alt}
        >
          <Package className="w-5 h-5 text-amber-400/75" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className={`w-12 h-12 rounded-xl object-cover border ${
            isOut ? 'border-red-500/50 grayscale opacity-70' : 'border-gym-border'
          }`}
        />
      )}
      {isOut && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-gym-card" />
      )}
    </div>
  );
};

export const InventoryManager: React.FC = () => {
  const { products, addProduct, updateProduct, adjustStock, deleteProduct, currentRole } = useGym();

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('protein');
  const [price, setPrice] = useState(500);
  const [costPrice, setCostPrice] = useState(350);
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(4);
  const [flavor, setFlavor] = useState('');
  const [description, setDescription] = useState('');
  const [soldByScoop, setSoldByScoop] = useState(false);
  const [scoopPrice, setScoopPrice] = useState(35);
  const [scoopsPerContainer, setScoopsPerContainer] = useState(30);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
    const totalRetailValue = products.reduce((acc, p) => acc + p.stock * p.price, 0);
    const totalCostValue = products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
    const projectedProfit = totalRetailValue - totalCostValue;
    const avgMarginPct =
      totalRetailValue > 0 ? Math.round((projectedProfit / totalRetailValue) * 1000) / 10 : 0;

    const outOfStockCount = products.filter((p) => p.stock <= 0).length;
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    const healthyCount = products.filter((p) => p.stock > p.minStock).length;
    const scoopProductsCount = products.filter((p) => p.soldByScoop).length;

    return {
      totalStockUnits,
      totalRetailValue,
      totalCostValue,
      projectedProfit,
      avgMarginPct,
      outOfStockCount,
      lowStockCount,
      healthyCount,
      scoopProductsCount,
    };
  }, [products]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    for (const cat of ALL_CATEGORIES) {
      counts[cat] = products.filter((p) => p.category === cat).length;
    }
    return counts;
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.flavor && p.flavor.toLowerCase().includes(q)) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'low') matchesStatus = p.stock <= p.minStock;
      else if (statusFilter === 'out') matchesStatus = p.stock <= 0;
      else if (statusFilter === 'optimal') matchesStatus = p.stock > p.minStock;
      else if (statusFilter === 'scoop') matchesStatus = Boolean(p.soldByScoop);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'stock_asc':
          return a.stock - b.stock;
        case 'stock_desc':
          return b.stock - a.stock;
        case 'margin_desc':
          return b.price - b.costPrice - (a.price - a.costPrice);
        case 'price_desc':
          return b.price - a.price;
        case 'name_asc':
        default:
          return a.name.localeCompare(b.name, 'es');
      }
    });
  }, [products, search, selectedCategory, statusFilter, sortBy]);

  const hasActiveFilters =
    search.trim() !== '' || selectedCategory !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setStatusFilter('all');
    setSortBy('name_asc');
  };

  // Open modal for New Product
  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setBrand('');
    setCategory('protein');
    setPrice(500);
    setCostPrice(350);
    setStock(10);
    setMinStock(4);
    setFlavor('');
    setDescription('');
    setSoldByScoop(false);
    setScoopPrice(35);
    setScoopsPerContainer(30);
    setShowModal(true);
  };

  // Open modal for Editing Existing Product
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setBrand(product.brand);
    setCategory(product.category);
    setPrice(product.price);
    setCostPrice(product.costPrice);
    setStock(product.stock);
    setMinStock(product.minStock);
    setFlavor(product.flavor || '');
    setDescription(product.description || '');
    setSoldByScoop(Boolean(product.soldByScoop));
    setScoopPrice(product.scoopPrice || 35);
    setScoopsPerContainer(product.scoopsPerContainer || 30);
    setShowModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: name.trim(),
        brand: brand.trim() || 'Legends Nutrition',
        category,
        price: Number(price),
        costPrice: Number(costPrice),
        stock: Number(stock),
        minStock: Number(minStock),
        description:
          description.trim() || 'Suplemento nutricional de alto rendimiento para deportistas.',
        flavor: flavor.trim() || undefined,
        soldByScoop,
        scoopPrice: soldByScoop ? Number(scoopPrice) : undefined,
        scoopsPerContainer: soldByScoop ? Number(scoopsPerContainer) : undefined,
      });
    } else {
      addProduct({
        name: name.trim(),
        brand: brand.trim() || 'Legends Nutrition',
        category,
        price: Number(price),
        costPrice: Number(costPrice),
        stock: Number(stock),
        minStock: Number(minStock),
        image:
          'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=400&q=80',
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        description:
          description.trim() || 'Suplemento nutricional de alto rendimiento para deportistas.',
        flavor: flavor.trim() || undefined,
        soldByScoop,
        scoopPrice: soldByScoop ? Number(scoopPrice) : undefined,
        scoopsPerContainer: soldByScoop ? Number(scoopsPerContainer) : undefined,
      });
    }

    setShowModal(false);
    setEditingProduct(null);
  };

  // Export CSV inventory report
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Código de Barras',
      'Producto',
      'Marca',
      'Sabor / Presentación',
      'Categoría',
      'Costo Unitario',
      'Precio Venta',
      'Utilidad Unitaria',
      'Venta por Scoop',
      'Precio Scoop',
      'Stock Actual',
      'Stock Mínimo',
      'Valor en Almacén',
      'Estado',
    ];

    const rows = filteredProducts.map((p) => {
      const statusLabel =
        p.stock <= 0 ? 'AGOTADO' : p.stock <= p.minStock ? 'STOCK BAJO' : 'ÓPTIMO';
      return [
        p.id,
        p.barcode,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.brand.replace(/"/g, '""')}"`,
        `"${(p.flavor || 'Original').replace(/"/g, '""')}"`,
        CATEGORY_META[p.category]?.label || p.category,
        p.costPrice,
        p.price,
        p.price - p.costPrice,
        p.soldByScoop ? 'Sí' : 'No',
        p.soldByScoop && p.scoopPrice ? p.scoopPrice : '',
        p.stock,
        p.minStock,
        p.stock * p.price,
        statusLabel,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_legends_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Live form margin preview
  const unitProfit = Number(price) - Number(costPrice);
  const unitMarginPct = Number(price) > 0 ? Math.round((unitProfit / Number(price)) * 100) : 0;

  return (
    <div className="h-full min-h-0 flex flex-col gap-1.5 overflow-hidden">
      {/* 1. COMPACT KIOSK HEADER BAR (shrink-0) */}
      <div className="relative bg-gradient-to-r from-zinc-900/95 via-[#131318] to-zinc-900/95 px-3.5 py-2 rounded-2xl border border-white/[0.12] shadow-lg flex flex-wrap items-center justify-between gap-2 shrink-0 overflow-hidden">
        <div className="absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.3)] border border-amber-200/60 shrink-0">
            <Package className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
              Control de Inventario & Almacén
            </h1>
            <span className="text-[10px] font-mono text-zinc-300 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.1]">
              {products.length} SKUs
            </span>
            {metrics.scoopProductsCount > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25 font-bold">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                {metrics.scoopProductsCount} Scoop
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-8.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/25 text-zinc-200 font-bold text-xs transition-all"
            title="Exportar inventario filtrado a CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="h-8.5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold transition-all active:scale-95"
            >
              <PackagePlus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuevo Producto</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SLIM HORIZONTAL KPI STRIP (shrink-0) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        {/* KPI 1: Unidades */}
        <div className="px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
              Unidades en Almacén
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold block truncate">
              {metrics.healthyCount} óptimos de {products.length}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg sm:text-xl font-black text-white font-mono">
              {metrics.totalStockUnits.toLocaleString()}
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 hidden sm:flex items-center justify-center text-zinc-300">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* KPI 2: Valor Venta */}
        <div className="px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider block truncate">
              Valor Precio Venta
            </span>
            <span className="text-[11px] text-zinc-400 block truncate">
              Ingreso proyectado
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
              ${metrics.totalRetailValue.toLocaleString()}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 hidden sm:flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* KPI 3: Costo & Utilidad */}
        <div className="px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block truncate">
              Costo Inversión
            </span>
            <span className="text-[11px] text-emerald-400 font-mono font-bold block truncate">
              Ut: +${metrics.projectedProfit.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base sm:text-lg font-black text-sky-400 font-mono">
              ${metrics.totalCostValue.toLocaleString()}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 hidden sm:flex items-center justify-center text-sky-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* KPI 4: Alertas Stock Bajo */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
          className={`px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
            statusFilter === 'low'
              ? 'bg-red-500/15 border-red-500 ring-1 ring-red-500/40'
              : metrics.lowStockCount > 0
              ? 'bg-red-950/25 border-red-500/35 hover:border-red-500/60'
              : 'bg-gym-card border-gym-border hover:border-white/15'
          }`}
        >
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 truncate">
              {metrics.lowStockCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
              )}
              Stock Bajo / Reorden
            </span>
            <span className="text-[11px] text-zinc-300 block truncate">
              {statusFilter === 'low' ? 'Mostrando alertas (quitar)' : 'Clic para filtrar alertas'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg sm:text-xl font-black text-red-400 font-mono">
              {metrics.lowStockCount}
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 hidden sm:flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>

      {/* 3. SINGLE-LINE UNIFIED FILTER & SEARCH BAR (shrink-0) */}
      <div className="bg-gym-card px-3 py-1.5 rounded-xl border border-gym-border flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto, marca o código..."
              className="w-full h-8 pl-8 pr-7 bg-gym-surface rounded-lg border border-gym-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Segmented Tabs */}
          <div className="hidden md:flex items-center bg-gym-surface p-0.5 rounded-lg border border-gym-border">
            {(
              [
                { id: 'all', label: 'Todos', count: products.length },
                { id: 'optimal', label: 'Óptimos', count: metrics.healthyCount },
                { id: 'low', label: 'Stock Bajo', count: metrics.lowStockCount },
                { id: 'out', label: 'Agotados', count: metrics.outOfStockCount },
                { id: 'scoop', label: 'Scoop', count: metrics.scoopProductsCount },
              ] as { id: StockStatusFilter; label: string; count: number }[]
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    active
                      ? tab.id === 'low' || tab.id === 'out'
                        ? 'bg-red-500 text-white'
                        : 'bg-amber-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.id === 'scoop' && <Sparkles className="w-2.5 h-2.5" />}
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono opacity-80">({tab.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Dropdown, Sort Dropdown & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex items-center">
            <Filter className="w-3 h-3 text-zinc-400 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | 'all')}
              className="h-8 pl-7 pr-2.5 bg-gym-surface rounded-lg border border-gym-border text-xs font-semibold text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">Categorías ({categoryCounts.all})</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_META[cat].label} ({categoryCounts[cat] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center">
            <ArrowUpDown className="w-3 h-3 text-zinc-400 absolute left-2.5 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 pl-7 pr-2.5 bg-gym-surface rounded-lg border border-gym-border text-xs font-semibold text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="name_asc">Nombre (A-Z)</option>
              <option value="stock_asc">Menor Stock</option>
              <option value="stock_desc">Mayor Stock</option>
              <option value="price_desc">Mayor Precio</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 flex items-center gap-1 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[11px] font-bold text-amber-300 transition-colors"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}

          <span className="hidden xl:inline text-[11px] font-mono text-zinc-400 pl-1">
            {filteredProducts.length}/{products.length}
          </span>
        </div>
      </div>

      {/* 4. INTERNAL-SCROLL EXPANDED DATA TABLE (flex-1 min-h-0) */}
      <div className="flex-1 min-h-0 bg-gym-card rounded-2xl border border-gym-border flex flex-col overflow-hidden shadow-xl">
        <div className="flex-1 min-h-0 overflow-auto pos-scroll">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-[#141419] border-b border-gym-border text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-zinc-300 shadow-sm">
              <tr>
                <th className="py-3 px-4">Producto / Especificación</th>
                <th className="py-3 px-3.5">Categoría</th>
                <th className="py-3 px-3.5">Costo / Venta</th>
                <th className="py-3 px-3.5">Nivel de Stock</th>
                <th className="py-3 px-3.5 text-center">Ajuste Rápido</th>
                {currentRole === 'admin' && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/45 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={currentRole === 'admin' ? 6 : 5} className="py-12 px-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gym-surface border border-gym-border flex items-center justify-center mx-auto text-zinc-500 mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="text-base font-bold text-white">
                      No se encontraron suplementos con los filtros actuales
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restablecer filtros</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = p.stock <= 0;
                  const isLow = !isOut && p.stock <= p.minStock;
                  const catMeta = CATEGORY_META[p.category] || {
                    label: p.category,
                    badgeClass: 'bg-gym-surface text-zinc-300 border-gym-border',
                    dotClass: 'bg-zinc-400',
                  };

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors group ${
                        isOut
                          ? 'bg-red-950/15 hover:bg-red-950/25'
                          : isLow
                          ? 'bg-amber-950/10 hover:bg-gym-surface/50'
                          : 'hover:bg-gym-surface/50'
                      }`}
                    >
                      {/* Col 1: Enlarged Product Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3.5">
                          <ProductThumbnail key={p.image} src={p.image} alt={p.name} isOut={isOut} />

                          <div className="min-w-0">
                            <div className="font-extrabold text-white text-sm sm:text-[15px] flex items-center gap-2 flex-wrap leading-snug">
                              <span className="truncate max-w-[320px]">{p.name}</span>
                              {p.soldByScoop && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
                                  <Sparkles className="w-3 h-3 text-amber-400" /> Scoop
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 truncate">
                              <span className="text-zinc-200 font-semibold">{p.brand}</span>
                              <span>•</span>
                              <span className="truncate max-w-[220px]">{p.flavor || 'Original'}</span>
                              <span className="hidden 2xl:inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500 ml-1">
                                <Barcode className="w-3 h-3" />
                                {p.barcode}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Category */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center gap-2 text-xs sm:text-[13px] font-bold px-3 py-1 rounded-lg border whitespace-nowrap ${catMeta.badgeClass}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${catMeta.dotClass}`} />
                          {catMeta.label}
                        </span>
                      </td>

                      {/* Col 3: Enlarged Price / Cost / Scoop */}
                      <td className="py-3 px-3.5 font-mono">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-amber-400 font-black text-sm sm:text-[15px]">
                            Venta: ${p.price.toLocaleString()} MXN
                          </span>
                          {p.soldByScoop && p.scoopPrice && (
                            <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md font-bold">
                              🥄 ${p.scoopPrice}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 leading-tight mt-1">
                          Costo: ${p.costPrice.toLocaleString()} MXN
                        </div>
                      </td>

                      {/* Col 4: Enlarged Stock Pill & Status */}
                      <td className="py-3 px-3.5">
                        <div className="inline-flex items-center gap-3">
                          <div
                            className={`min-w-[46px] h-10 px-2.5 rounded-xl border flex items-center justify-center font-mono text-sm sm:text-base font-black shrink-0 ${
                              isOut
                                ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.18)]'
                                : isLow
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {p.stock}
                          </div>

                          <div className="leading-tight whitespace-nowrap">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-red-400">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                Agotado
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-amber-400">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                Stock bajo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                Disponible
                              </span>
                            )}
                            <span className="block text-[11px] font-mono text-zinc-400 mt-0.5">
                              Mín. {p.minStock} pzas
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Col 5: Enlarged Quick Stock Adjust */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex items-center gap-1 bg-gym-surface p-1 rounded-xl border border-gym-border">
                          <button
                            type="button"
                            disabled={p.stock <= 0}
                            onClick={() => adjustStock(p.id, -1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Restar 1 unidad"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => adjustStock(p.id, 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Sumar 1 unidad"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          <div className="w-px h-5 bg-gym-border mx-0.5" />

                          <button
                            type="button"
                            onClick={() => adjustStock(p.id, 5)}
                            className="h-8 px-2.5 rounded-lg text-xs font-mono font-extrabold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-colors"
                            title="Sumar +5 unidades"
                          >
                            +5
                          </button>

                          <button
                            type="button"
                            onClick={() => adjustStock(p.id, 10)}
                            className="h-8 px-2.5 rounded-lg text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                            title="Sumar +10 unidades"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Col 6: Enlarged Admin Actions */}
                      {currentRole === 'admin' && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gym-surface hover:bg-amber-500/15 text-zinc-400 hover:text-amber-400 border border-gym-border hover:border-amber-500/30 transition-all"
                              title="Editar suplemento"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Eliminar "${p.name}" del inventario?`)) {
                                  deleteProduct(p.id);
                                }
                              }}
                              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gym-surface hover:bg-red-500/15 text-zinc-400 hover:text-red-400 border border-gym-border hover:border-red-500/30 transition-all"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. CREATE / EDIT PRODUCT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-lg shadow-2xl relative my-4 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-gym-border flex items-center justify-between bg-gym-surface/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  {editingProduct ? <Edit3 className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">
                    {editingProduct ? 'Editar Suplemento' : 'Agregar Suplemento al Catálogo'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {editingProduct
                      ? `Actualizando ${editingProduct.name}`
                      : 'Registra un nuevo producto en almacén y punto de venta'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                }}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5 overflow-y-auto flex-1 pos-scroll">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Nombre del Suplemento *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Mass Gainer Pro 12lb"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ej. Optimum Nutrition"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price, Cost & Live Margin Preview */}
              <div className="p-3 rounded-xl bg-gym-surface/60 border border-gym-border space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Precio Venta ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-gym-card rounded-xl border border-gym-border text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Costo Compra ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-gym-card rounded-xl border border-gym-border text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gym-border/60">
                  <span className="text-zinc-400">Utilidad estimada por bote:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                      unitProfit >= 0
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-red-500/15 text-red-400 border border-red-500/25'
                    }`}
                  >
                    {unitProfit >= 0 ? '+' : ''}${unitProfit.toLocaleString()} MXN ({unitMarginPct}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    {editingProduct ? 'Stock Actual' : 'Stock Inicial'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Stock Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Sabor / Presentación
                </label>
                <input
                  type="text"
                  value={flavor}
                  onChange={(e) => setFlavor(e.target.value)}
                  placeholder="Ej. Fresa Plátano • 60 servicios"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Apartado: Venta por Scoop */}
              <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        soldByScoop
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-gym-card text-zinc-400 border border-gym-border'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <label
                        onClick={() => setSoldByScoop(!soldByScoop)}
                        className="text-xs font-bold text-white cursor-pointer select-none block"
                      >
                        ¿Se venderá por Scoop / Porción?
                      </label>
                      <p className="text-[11px] text-zinc-400">
                        Habilita la venta en tomas o batidos individuales
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <button
                    type="button"
                    onClick={() => setSoldByScoop(!soldByScoop)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      soldByScoop ? 'bg-amber-500' : 'bg-gym-border'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                        soldByScoop ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-400'
                      }`}
                    />
                  </button>
                </div>

                {soldByScoop && (
                  <div className="space-y-2 pt-2.5 border-t border-gym-border/60">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 block mb-1">
                          Precio por Scoop ($) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1.5 text-zinc-400 text-sm font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            value={scoopPrice}
                            onChange={(e) => setScoopPrice(Number(e.target.value))}
                            placeholder="35"
                            min="1"
                            required={soldByScoop}
                            className="w-full pl-7 pr-3 py-1.5 bg-gym-card rounded-xl border border-gym-border text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 block mb-1">
                          Scoops por Bote / Envase
                        </label>
                        <input
                          type="number"
                          value={scoopsPerContainer}
                          onChange={(e) => setScoopsPerContainer(Number(e.target.value))}
                          placeholder="30"
                          min="1"
                          className="w-full px-3 py-1.5 bg-gym-card rounded-xl border border-gym-border text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {scoopPrice > 0 && scoopsPerContainer > 0 && (
                      <div className="flex items-center justify-between text-[11px] bg-amber-500/[0.08] border border-amber-500/20 rounded-lg px-3 py-1.5">
                        <span className="text-zinc-300">Ingreso total vendiendo por scoop:</span>
                        <span className="font-mono font-bold text-amber-300">
                          ${(scoopPrice * scoopsPerContainer).toLocaleString()} MXN
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2.5 border-t border-gym-border shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold transition-all"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
