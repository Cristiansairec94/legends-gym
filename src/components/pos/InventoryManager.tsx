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
  CheckCircle2
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
          return (b.price - b.costPrice) - (a.price - a.costPrice);
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
    <div className="space-y-5">
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="bg-gradient-to-r from-zinc-900/95 via-[#131318] to-zinc-900/95 p-5 sm:p-6 rounded-2xl border border-white/[0.1] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-amber-500/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-10 w-64 h-64 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-glow-gold/20">
              <Package className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  ALMACÉN & SUPLEMENTOS
                </span>
                <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.07]">
                  {products.length} SKUs registrados
                </span>
                {metrics.scoopProductsCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-500/[0.08] px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {metrics.scoopProductsCount} con venta por scoop
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
                Control de Inventario & Almacén
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Monitoreo de existencias en tiempo real, costos de inversión, márgenes de utilidad y reabastecimiento rápido.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/25 text-zinc-200 font-bold text-xs transition-all"
              title="Exportar tabla actual a CSV / Excel"
            >
              <Download className="w-4 h-4 text-zinc-300" />
              <span>Exportar CSV</span>
            </button>

            {currentRole === 'admin' && (
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs sm:text-sm shadow-glow-gold transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <PackagePlus className="w-4 h-4 stroke-[2.5]" />
                <span>Nuevo Producto</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* KPI 1: Unidades */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gym-card border border-gym-border hover:border-white/15 transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Unidades en Almacén
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  {metrics.totalStockUnits.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-400 font-medium">pzas totales</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-200 shrink-0 group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gym-border/70 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {metrics.healthyCount} con stock óptimo
            </span>
            <span className="text-zinc-400 font-mono">{products.length} SKUs</span>
          </div>
        </div>

        {/* KPI 2: Valor Comercial */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gym-card border border-gym-border hover:border-amber-500/30 transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider block">
                Valor a Precio Venta
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                  ${metrics.totalRetailValue.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-400/70 font-mono">MXN</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gym-border/70 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Ingreso bruto proyectado</span>
            <span className="text-amber-300 font-mono font-semibold">
              Margen {metrics.avgMarginPct}%
            </span>
          </div>
        </div>

        {/* KPI 3: Costo de Inversión & Utilidad */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gym-card border border-gym-border hover:border-sky-500/30 transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                Costo de Inversión
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono tracking-tight">
                  ${metrics.totalCostValue.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-sky-400/70 font-mono">MXN</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gym-border/70 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Utilidad neta est.:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono font-bold">
              +${metrics.projectedProfit.toLocaleString()} MXN
            </span>
          </div>
        </div>

        {/* KPI 4: Alertas de Stock Bajo */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            statusFilter === 'low'
              ? 'bg-red-500/15 border-red-500 ring-1 ring-red-500/50 shadow-glow-red/20'
              : metrics.lowStockCount > 0
              ? 'bg-gradient-to-br from-red-950/35 via-gym-card to-gym-card border-red-500/35 hover:border-red-500/60'
              : 'bg-gym-card border-gym-border hover:border-white/15'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                {metrics.lowStockCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
                Stock Bajo / Reorden
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-red-400 font-mono tracking-tight">
                  {metrics.lowStockCount}
                </span>
                <span className="text-xs text-red-300/80 font-medium">
                  {metrics.outOfStockCount > 0
                    ? `(${metrics.outOfStockCount} agotados)`
                    : 'alertas activas'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-red-500/20 flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-medium">
              {statusFilter === 'low'
                ? 'Mostrando solo alertas'
                : 'Haz clic para filtrar alertas'}
            </span>
            <span className="text-red-300 font-bold underline decoration-red-400/50">
              {statusFilter === 'low' ? 'Ver todos' : 'Filtrar'}
            </span>
          </div>
        </button>
      </div>

      {/* 3. SMART TOOLBAR: SEARCH, STATUS SEGMENTS, SORT & CATEGORY PILLS */}
      <div className="bg-gym-card p-4 rounded-2xl border border-gym-border space-y-3.5 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, marca, sabor o código..."
              className="w-full pl-10 pr-9 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Segmented Controls & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-gym-surface p-1 rounded-xl border border-gym-border overflow-x-auto no-scrollbar">
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
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      active
                        ? tab.id === 'low' || tab.id === 'out'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-amber-500 text-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.id === 'scoop' && <Sparkles className="w-3 h-3" />}
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        active ? 'bg-black/20 text-current' : 'bg-white/[0.06] text-zinc-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="pl-8 pr-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-xs font-semibold text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="name_asc">Ordenar: Nombre (A-Z)</option>
                <option value="stock_asc">Stock: Menor a Mayor</option>
                <option value="stock_desc">Stock: Mayor a Menor</option>
                <option value="margin_desc">Mayor Margen ($)</option>
                <option value="price_desc">Precio: Mayor a Menor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-gym-border/60">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-gym-surface/70 text-zinc-400 border-gym-border hover:text-white hover:border-white/20'
              }`}
            >
              Todas ({categoryCounts.all})
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-sm'
                      : 'bg-gym-surface/70 text-zinc-400 border-gym-border hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                  <span>{meta.label}</span>
                  <span className="text-[10px] font-mono opacity-75">({categoryCounts[cat] || 0})</span>
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 shrink-0 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. INVENTORY DATA TABLE */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden shadow-xl">
        {/* Table Result Bar */}
        <div className="px-5 py-3 border-b border-gym-border bg-gym-surface/30 flex items-center justify-between text-xs text-zinc-400">
          <span>
            Mostrando <strong className="text-white font-mono">{filteredProducts.length}</strong> de{' '}
            <strong className="text-white font-mono">{products.length}</strong> suplementos
          </span>
          <span className="hidden sm:inline text-[11px] text-zinc-500">
            Ajusta existencias en tiempo real con los controles rápidos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gym-border bg-gym-surface/60 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-4">Producto / Especificación</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Precio / Costo & Margen</th>
                <th className="py-3.5 px-4">Nivel de Stock</th>
                <th className="py-3.5 px-4 text-center">Ajuste Rápido</th>
                {currentRole === 'admin' && <th className="py-3.5 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/50 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={currentRole === 'admin' ? 6 : 5} className="py-14 px-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gym-surface border border-gym-border flex items-center justify-center mx-auto text-zinc-500 mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-white">
                      No se encontraron productos con los filtros actuales
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Intenta cambiar el término de búsqueda o restablecer las categorías seleccionadas.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors"
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

                  const profit = p.price - p.costPrice;
                  const marginPct = p.price > 0 ? Math.round((profit / p.price) * 100) : 0;

                  // Stock bar visual ratio against 3x minStock (or 20 fallback)
                  const targetHealthy = Math.max(p.minStock * 3, 15);
                  const stockBarPct = Math.min(100, Math.max(isOut ? 0 : 8, Math.round((p.stock / targetHealthy) * 100)));

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
                      {/* Col 1: Product Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative shrink-0">
                            <img
                              src={p.image}
                              alt={p.name}
                              className={`w-11 h-11 rounded-xl object-cover border transition-transform group-hover:scale-105 ${
                                isOut ? 'border-red-500/50 grayscale opacity-70' : 'border-gym-border'
                              }`}
                            />
                            {isOut && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-gym-card" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                              <span className="truncate max-w-[240px]">{p.name}</span>
                              {p.soldByScoop && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-bold">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Scoop
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-zinc-400">
                              <span className="font-medium text-zinc-300">{p.brand}</span>
                              <span>•</span>
                              <span>{p.flavor || 'Original'}</span>
                              <span className="hidden xl:inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500 bg-white/[0.03] px-1.5 py-0.2 rounded border border-white/[0.06]">
                                <Barcode className="w-2.5 h-2.5 text-zinc-400" />
                                {p.barcode}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Category (Spanish semantic badge) */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${catMeta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${catMeta.dotClass}`} />
                          {catMeta.label}
                        </span>
                      </td>

                      {/* Col 3: Cost, Retail Price, Margin & Scoop */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-black text-sm">
                            ${p.price.toLocaleString()} <span className="text-[10px] font-bold text-amber-400/70">MXN</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              marginPct >= 25
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/25'
                            }`}
                            title={`Utilidad unitaria: +$${profit.toLocaleString()} MXN`}
                          >
                            +{marginPct}%
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span>Costo: ${p.costPrice.toLocaleString()}</span>
                          <span className="text-emerald-400/90 font-semibold">
                            (+${profit.toLocaleString()})
                          </span>
                        </div>
                        {p.soldByScoop && p.scoopPrice && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                            <span>🥄 Scoop: ${p.scoopPrice} MXN</span>
                            {p.scoopsPerContainer && (
                              <span className="text-zinc-400 font-normal">
                                ({p.scoopsPerContainer} serv.)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Col 4: Stock Level & Health Bar */}
                      <td className="py-3.5 px-4">
                        <div className="w-36 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-black font-mono px-2 py-0.5 rounded-md border ${
                                isOut
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : isLow
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-gym-surface text-white border-gym-border'
                              }`}
                            >
                              {isOut ? 'AGOTADO (0)' : `${p.stock} uds`}
                            </span>

                            <span className="text-[10px] font-mono text-zinc-400">
                              Mín: {p.minStock}
                            </span>
                          </div>

                          {/* Visual Stock Progress Bar */}
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOut
                                  ? 'bg-red-500'
                                  : isLow
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                              }`}
                              style={{ width: `${stockBarPct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                            <span>
                              {isOut ? (
                                <span className="text-red-400 font-bold">Sin existencias</span>
                              ) : isLow ? (
                                <span className="text-amber-400 font-bold">Reabastecer</span>
                              ) : (
                                'Disponible'
                              )}
                            </span>
                            <span>${(p.stock * p.price).toLocaleString()}</span>
                          </div>
                        </div>
                      </td>

                      {/* Col 5: Quick Stock Adjust */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-gym-surface p-1 rounded-xl border border-gym-border shadow-inner">
                          <button
                            type="button"
                            disabled={p.stock <= 0}
                            onClick={() => adjustStock(p.id, -1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Descontar 1 unidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => adjustStock(p.id, 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Sumar 1 unidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-px h-4 bg-gym-border mx-0.5" />

                          <button
                            type="button"
                            onClick={() => adjustStock(p.id, 5)}
                            className="px-2 py-1 rounded-lg text-[11px] font-mono font-extrabold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-colors"
                            title="Agregar lote de +5 unidades"
                          >
                            +5
                          </button>

                          <button
                            type="button"
                            onClick={() => adjustStock(p.id, 10)}
                            className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                            title="Agregar lote de +10 unidades"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Col 6: Admin Actions (Edit + Delete) */}
                      {currentRole === 'admin' && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-2 rounded-xl bg-gym-surface hover:bg-amber-500/15 text-zinc-400 hover:text-amber-400 border border-gym-border hover:border-amber-500/30 transition-all"
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
                              className="p-2 rounded-xl bg-gym-surface hover:bg-red-500/15 text-zinc-400 hover:text-red-400 border border-gym-border hover:border-red-500/30 transition-all"
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
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-lg shadow-2xl relative my-6 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gym-border flex items-center justify-between bg-gym-surface/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  {editingProduct ? <Edit3 className="w-4 h-4" /> : <PackagePlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {editingProduct ? 'Editar Suplemento' : 'Agregar Suplemento al Catálogo'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {editingProduct
                      ? `Actualizando parámetros de ${editingProduct.name}`
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
            <form onSubmit={handleSaveProduct} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
                  className="w-full px-3.5 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ej. Optimum Nutrition"
                    className="w-full px-3.5 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3.5 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
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
              <div className="p-3.5 rounded-xl bg-gym-surface/60 border border-gym-border space-y-3">
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
                      className="w-full px-3 py-2 bg-gym-card rounded-xl border border-gym-border text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
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
                      className="w-full px-3 py-2 bg-gym-card rounded-xl border border-gym-border text-sm font-mono text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full px-3.5 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-sm font-mono text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full px-3.5 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-sm font-mono text-white focus:outline-none focus:border-amber-400"
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
                  className="w-full px-3.5 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Apartado: Venta por Scoop */}
              <div className="p-3.5 rounded-xl bg-gym-surface/80 border border-gym-border space-y-3">
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
                        Habilita la venta de este suplemento en tomas o batidos individuales
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
                  <div className="space-y-2.5 pt-3 border-t border-gym-border/60">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 block mb-1">
                          Precio por Scoop ($) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-zinc-400 text-sm font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            value={scoopPrice}
                            onChange={(e) => setScoopPrice(Number(e.target.value))}
                            placeholder="35"
                            min="1"
                            required={soldByScoop}
                            className="w-full pl-7 pr-3 py-2 bg-gym-card rounded-xl border border-gym-border text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
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
                          className="w-full px-3 py-2 bg-gym-card rounded-xl border border-gym-border text-sm text-white font-mono focus:outline-none focus:border-amber-400"
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
              <div className="flex justify-end gap-2 pt-3 border-t border-gym-border shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gym-surface text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold transition-all"
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
