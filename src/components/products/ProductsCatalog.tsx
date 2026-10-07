import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { Product, ProductCategory } from '../../types';
import { 
  Package, 
  Search, 
  LayoutGrid, 
  List, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Barcode, 
  Clock, 
  Bell, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Sliders, 
  Sparkles,
  Zap,
  Tag,
  ShoppingBag,
  Layers
} from 'lucide-react';

export const ProductsCatalog: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, currentRole } = useGym();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State for New / Edit Product
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('protein');
  const [formPrice, setFormPrice] = useState(1450);
  const [formCostPrice, setFormCostPrice] = useState(1100);
  const [formStock, setFormStock] = useState(15);
  const [formMinStock, setFormMinStock] = useState(4);
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formTaxRate, setFormTaxRate] = useState<'IVA 16%' | 'Tasa 0%' | 'IEPS 8%' | 'Exento'>('IVA 16%');
  const [formImage, setFormImage] = useState('');
  const [formFlavor, setFormFlavor] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Custom Categories list
  const [customCategories, setCustomCategories] = useState<{ id: string; name: string; icon: string }[]>([
    { id: 'protein', name: 'Proteínas Whey & ISO', icon: '🥛' },
    { id: 'creatine', name: 'Creatinas Puras', icon: '💥' },
    { id: 'preworkout', name: 'Pre-Entrenos & Energía', icon: '🔥' },
    { id: 'beverage', name: 'Bebidas & Hidratación', icon: '🥤' },
    { id: 'snack', name: 'Snacks Proteicos & Barras', icon: '🍫' },
    { id: 'aminoacids', name: 'Aminoácidos & BCAAs', icon: '🧬' },
    { id: 'gear', name: 'Ropa & Accesorios Gear', icon: '🏋️' },
    { id: 'promo', name: 'PRECIO MAYOREO / PROMO', icon: '🏷️' },
  ]);

  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('⚡');

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCat === 'all' || p.category === selectedCat;
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.flavor && p.flavor.toLowerCase().includes(search.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return products.length;
    return products.filter(p => p.category === catId).length;
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBrand(p.brand);
    setFormCategory(p.category);
    setFormPrice(p.price);
    setFormCostPrice(p.costPrice);
    setFormStock(p.stock);
    setFormMinStock(p.minStock);
    setFormBarcode(p.barcode);
    setFormSku(p.sku || `#${p.id}`);
    setFormTaxRate(p.taxRate || 'IVA 16%');
    setFormImage(p.image);
    setFormFlavor(p.flavor || '');
    setFormDescription(p.description);
    setShowAddProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formName.trim(),
        brand: formBrand.trim(),
        category: formCategory,
        price: Number(formPrice),
        costPrice: Number(formCostPrice),
        stock: Number(formStock),
        minStock: Number(formMinStock),
        barcode: formBarcode.trim() || editingProduct.barcode,
        sku: formSku.trim() || `#${editingProduct.id}`,
        taxRate: formTaxRate,
        image: formImage.trim() || editingProduct.image,
        flavor: formFlavor.trim() || undefined,
        description: formDescription.trim(),
      });
    } else {
      addProduct({
        name: formName.trim(),
        brand: formBrand.trim() || 'Legends Nutrition',
        category: formCategory,
        price: Number(formPrice),
        costPrice: Number(formCostPrice),
        stock: Number(formStock),
        minStock: Number(formMinStock),
        barcode: formBarcode.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        sku: formSku.trim() || `#PROD-${String(products.length + 1).padStart(3, '0')}`,
        taxRate: formTaxRate,
        image: formImage.trim() || 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=400&q=80',
        flavor: formFlavor.trim() || undefined,
        description: formDescription.trim() || 'Suplemento de alto valor biológico para entrenamiento.',
      });
    }

    setShowAddProductModal(false);
    setEditingProduct(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newId = newCatName.toLowerCase().replace(/\s+/g, '_');
    setCustomCategories(prev => [...prev, { id: newId, name: newCatName.trim(), icon: newCatIcon }]);
    setShowAddCategoryModal(false);
    setNewCatName('');
  };

  return (
    <div className="space-y-4">
      
      {/* 1. TOP SUB-HEADER BAR (Exactly as in screenshot) */}
      <div className="bg-gym-card rounded-2xl border border-gym-border p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        
        {/* Left Brand Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-glow-gold border border-amber-400/50">
            <Package className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base text-white tracking-wide">
                Catálogo de Productos
              </h2>
            </div>
            <p className="text-[11px] text-gym-muted font-medium">
              Gestión de suplementos, proteínas, precios y fotografías
            </p>
          </div>
        </div>

        {/* Right Status Pills */}
        <div className="flex items-center gap-2 text-xs">
          {/* Sincronizado Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sincronizado</span>
          </div>

          {/* Matriz Dropdown Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gym-surface text-gray-200 border border-gym-border font-semibold">
            <span className="text-amber-400 font-bold">🏪 Matriz</span>
            <ChevronDown className="w-3.5 h-3.5 text-gym-muted" />
          </div>

          {/* Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gym-surface text-gym-muted border border-gym-border font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTime.toLocaleTimeString('es-MX')}</span>
          </div>

          {/* Notification bell badge */}
          <div className="relative p-2 rounded-full bg-gym-surface border border-gym-border text-gym-muted hover:text-white cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              12
            </span>
          </div>

          {/* Cashier / Manager User Card */}
          <div className="flex items-center gap-2 pl-2 border-l border-gym-border">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-xs">
              {currentRole === 'admin' ? 'RG' : 'CR'}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <span className="font-bold text-xs text-white block">
                {currentRole === 'admin' ? 'Don Roberto Garza' : 'Camila Herrera'}
              </span>
              <span className="text-[9px] font-extrabold uppercase text-amber-400">
                {currentRole === 'admin' ? 'DUEÑO / ADMINISTRADOR' : 'RECEPCIÓN / CAJERA'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. SEARCH & VIEW MODE BAR */}
      <div className="bg-gym-card rounded-2xl border border-gym-border p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gym-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar suplemento, proteína, shaker o código de barras..."
            className="w-full pl-10 pr-4 py-2 bg-gym-surface rounded-xl border border-gym-border text-xs text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Counter and Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono font-bold text-gym-muted">
            {filteredProducts.length} de {products.length} productos
          </span>

          {/* View Toggle: [Cuadrícula] [Lista] */}
          <div className="flex items-center bg-gym-surface p-1 rounded-xl border border-gym-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cuadrícula</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. CATEGORÍAS DEL CATÁLOGO SECTION (Collapsible Card Grid exactly as in screenshot) */}
      <div className="bg-gym-card rounded-2xl border border-gym-border p-4 shadow-md space-y-3">
        
        {/* Header Strip with + Categorías and Ocultar Lista */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              CATEGORÍAS DEL CATÁLOGO:
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gym-surface text-gym-muted border border-gym-border font-bold">
              👜 Todas ({products.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Categorías</span>
            </button>

            <button
              onClick={() => setIsCategoriesVisible(!isCategoriesVisible)}
              className="px-3 py-1.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>{isCategoriesVisible ? 'Ocultar Lista' : 'Mostrar Lista'}</span>
              {isCategoriesVisible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible 2-Row Category Cards Grid */}
        {isCategoriesVisible && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1 animate-fade-in">
            
            {/* Todas las Categorías Card */}
            <button
              onClick={() => setSelectedCat('all')}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                selectedCat === 'all'
                  ? 'bg-gradient-to-r from-amber-950/80 to-gym-surface border-2 border-amber-500 text-white shadow-glow-gold/20'
                  : 'bg-gym-surface hover:bg-gym-surface/80 border-gym-border text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">👜</span>
                <span className="font-bold text-xs">Todas las Categorías</span>
              </div>
              <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg ${
                selectedCat === 'all' ? 'bg-amber-500 text-black' : 'bg-gym-card text-gym-muted'
              }`}>
                {products.length}
              </span>
            </button>

            {/* Dynamic Custom Categories */}
            {customCategories.map((cat) => {
              const isSelected = selectedCat === cat.id;
              const count = getCategoryCount(cat.id);

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-950/80 to-gym-surface border-2 border-amber-500 text-white shadow-glow-gold/20'
                      : 'bg-gym-surface hover:bg-gym-surface/80 border-gym-border text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="font-bold text-xs truncate">{cat.name}</span>
                  </div>
                  <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg shrink-0 ${
                    isSelected ? 'bg-amber-500 text-black' : 'bg-gym-card text-gym-muted'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* + Nueva Categoría Dashed Card */}
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="p-3 rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nueva Categoría</span>
            </button>

          </div>
        )}

      </div>

      {/* 4. PRODUCTS DISPLAY: GRID VIEW (Exact match to screenshot card structure) OR LIST VIEW */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const tax = p.taxRate || 'IVA 16%';
            const sku = p.sku || `#${p.id}`;

            return (
              <div
                key={p.id}
                onClick={() => openEditModal(p)}
                className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden shadow-lg hover:border-amber-400/60 hover:shadow-glow-gold/20 transition-all cursor-pointer group flex flex-col justify-between"
              >
                {/* Image Container with Badges */}
                <div className="relative h-44 w-full bg-gym-surface overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Top-Left Barcode Strip Pill on Image (as in screenshot) */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/85 border border-white/10 px-2 py-0.5 rounded-md text-[10px] font-mono text-amber-300 shadow-md">
                    <Barcode className="w-3 h-3 text-amber-400" />
                    <span>{p.barcode}</span>
                  </div>

                  {/* Category Pill next to barcode or top-right on Image (as in screenshot) */}
                  <div className="absolute top-2 right-2">
                    <span className="bg-blue-600/90 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-md backdrop-blur-sm">
                      {p.category}
                    </span>
                  </div>
                </div>

                {/* Card Body & Details */}
                <div className="p-4 space-y-3">
                  
                  {/* First row: [ #SKU ] on left, [ $Price ⚡ ] on right */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-gray-300 bg-gym-surface px-2 py-0.5 rounded border border-gym-border">
                      {sku}
                    </span>

                    <div className="flex items-center gap-1">
                      <span className="text-lg font-mono font-black text-amber-400">
                        ${p.price.toFixed(2)}
                      </span>
                      <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-[10px] shadow-sm">
                        ⚡
                      </span>
                    </div>
                  </div>

                  {/* Second row: [ Barcode Box ] on left, [ /pz IVA 16% ] on right */}
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1 text-gym-muted font-mono bg-gym-surface/60 px-1.5 py-0.5 rounded border border-gym-border/60 text-[10px]">
                      <Barcode className="w-3 h-3 text-amber-400" />
                      <span className="truncate max-w-[90px]">{p.barcode}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gym-muted font-bold text-xs">/pz</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {tax}
                      </span>
                    </div>
                  </div>

                  {/* Third row: Product Title */}
                  <div>
                    <h3 className="font-black text-sm text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-gym-muted line-clamp-1 mt-0.5">
                      {p.flavor ? `${p.flavor} • ` : ''}{p.description}
                    </p>
                  </div>

                  {/* Stock footer */}
                  <div className="pt-2 border-t border-gym-border/60 flex items-center justify-between text-xs text-gym-muted">
                    <span>Stock: <strong className="text-white">{p.stock} pzas</strong></span>
                    <span className="text-[11px] text-amber-400 group-hover:underline">
                      Editar datos →
                    </span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW (Table Mode) */
        <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gym-border bg-gym-surface/40 text-[11px] font-bold uppercase tracking-wider text-gym-muted">
                  <th className="p-4">Producto</th>
                  <th className="p-4">SKU / Clave</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Código de Barras</th>
                  <th className="p-4">Impuesto</th>
                  <th className="p-4">Precio Venta</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border/40 text-sm">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gym-surface/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-gym-border shrink-0" />
                        <div>
                          <div className="font-bold text-white text-xs">{p.name}</div>
                          <div className="text-[11px] text-gym-muted">{p.brand} • {p.flavor || 'Original'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-xs text-gray-300">
                      {p.sku || `#${p.id}`}
                    </td>

                    <td className="p-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-gym-surface text-gray-200 border border-gym-border capitalize font-semibold">
                        {p.category}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-xs text-amber-300 flex items-center gap-1 mt-3">
                      <Barcode className="w-3.5 h-3.5 text-amber-400" />
                      <span>{p.barcode}</span>
                    </td>

                    <td className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {p.taxRate || 'IVA 16%'}
                      </span>
                    </td>

                    <td className="p-4 font-mono font-black text-sm text-amber-400">
                      ${p.price.toFixed(2)} MXN
                    </td>

                    <td className="p-4 font-bold text-xs text-white">
                      {p.stock} pzas
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg bg-gym-surface hover:bg-amber-500/20 text-gym-muted hover:text-amber-400 transition-colors"
                          title="Editar producto"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar ${p.name}?`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-gym-surface hover:bg-red-500/20 text-gym-muted hover:text-red-400 transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: AGREGAR O EDITAR PRODUCTO */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-xl overflow-hidden shadow-2xl relative my-6">
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  {editingProduct ? 'Editar Producto del Catálogo' : 'Agregar Nuevo Producto'}
                </h3>
              </div>
              <button onClick={() => { setShowAddProductModal(false); setEditingProduct(null); }} className="text-gym-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Nombre Comercial del Producto *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Gold Standard 100% Whey (5 lbs)"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Marca</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Ej. Optimum Nutrition"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="protein">Proteínas</option>
                    <option value="creatine">Creatinas</option>
                    <option value="preworkout">Pre-Entrenos</option>
                    <option value="aminoacids">Aminoácidos</option>
                    <option value="beverage">Bebidas</option>
                    <option value="snack">Snacks</option>
                    <option value="gear">Accesorios</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Código SKU / Clave</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="#WHEY-5LB"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Código de Barras</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="748927028669"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Costo ($)</label>
                  <input
                    type="number"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Impuesto</label>
                  <select
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(e.target.value as typeof formTaxRate)}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="IVA 16%">IVA 16%</option>
                    <option value="Tasa 0%">Tasa 0%</option>
                    <option value="IEPS 8%">IEPS 8%</option>
                    <option value="Exento">Exento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Stock Actual</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Sabor / Presentación</label>
                  <input
                    type="text"
                    value={formFlavor}
                    onChange={(e) => setFormFlavor(e.target.value)}
                    placeholder="Doble Chocolate"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">URL de Imagen del Producto</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Descripción Breve</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="24g de proteína de suero por porción..."
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => { setShowAddProductModal(false); setEditingProduct(null); }}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-xs font-semibold text-gym-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: AGREGAR NUEVA CATEGORÍA */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
              <h3 className="font-bold text-base text-white">Nueva Categoría de Catálogo</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-gym-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Nombre de la Categoría *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ej. Vitaminas & Minerales"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Emoji / Icono</label>
                <div className="flex gap-2">
                  {['💊', '⚡', '🏋️', '🥤', '🥗', '🔥', '🍫', '✨'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCatIcon(emoji)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base ${
                        newCatIcon === emoji ? 'bg-amber-500/20 border-amber-500' : 'bg-gym-surface border-gym-border'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-xs font-semibold text-gym-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold"
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
