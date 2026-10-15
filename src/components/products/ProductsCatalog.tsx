import React, { useState, useRef } from 'react';
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
  Layers,
  Printer,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { BarcodePrintModal } from './BarcodePrintModal';
import { CategoryManagerModal, CatalogCategory } from './CategoryManagerModal';

const DEFAULT_CATEGORIES: CatalogCategory[] = [
  { id: 'protein', name: 'Proteínas Whey & ISO', icon: '🥛' },
  { id: 'creatine', name: 'Creatinas Puras', icon: '💥' },
  { id: 'preworkout', name: 'Pre-Entrenos & Energía', icon: '🔥' },
  { id: 'beverage', name: 'Bebidas & Hidratación', icon: '🥤' },
  { id: 'snack', name: 'Snacks Proteicos & Barras', icon: '🍫' },
  { id: 'aminoacids', name: 'Aminoácidos & BCAAs', icon: '🧬' },
  { id: 'gear', name: 'Ropa & Accesorios Gear', icon: '🏋️' },
  { id: 'promo', name: 'PRECIO MAYOREO / PROMO', icon: '🏷️' },
];

export const ProductsCatalog: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, currentRole } = useGym();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCategoryManagerModal, setShowCategoryManagerModal] = useState(false);
  const [selectedCatToEdit, setSelectedCatToEdit] = useState<string | null>(null);
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false);
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
  const [formSoldByScoop, setFormSoldByScoop] = useState(false);
  const [formScoopPrice, setFormScoopPrice] = useState(35);
  const [formScoopsPerContainer, setFormScoopsPerContainer] = useState(30);

  // Custom Categories list with localStorage persistence
  const [customCategories, setCustomCategories] = useState<CatalogCategory[]>(() => {
    try {
      const saved = localStorage.getItem('legends_custom_categories_v1');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const handleSaveCategories = (updated: CatalogCategory[]) => {
    setCustomCategories(updated);
    try {
      localStorage.setItem('legends_custom_categories_v1', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving categories:', e);
    }
  };

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

  const openNewProductModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBrand('');
    setFormCategory('protein');
    setFormPrice(150);
    setFormCostPrice(90);
    setFormStock(10);
    setFormMinStock(3);
    setFormBarcode(`${Math.floor(100000000000 + Math.random() * 900000000000)}`);
    setFormSku(`#PROD-${String(products.length + 1).padStart(3, '0')}`);
    setFormTaxRate('IVA 16%');
    setFormImage('');
    setFormFlavor('');
    setFormDescription('');
    setFormSoldByScoop(false);
    setFormScoopPrice(35);
    setFormScoopsPerContainer(30);
    setShowAddProductModal(true);
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
    setFormSoldByScoop(!!p.soldByScoop);
    setFormScoopPrice(p.scoopPrice || 35);
    setFormScoopsPerContainer(p.scoopsPerContainer || 30);
    setShowAddProductModal(true);
  };

  const productImageInputRef = useRef<HTMLInputElement>(null);

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setFormImage(dataUrl);
        } else {
          setFormImage(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveProductImage = () => {
    setFormImage('');
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
        soldByScoop: formSoldByScoop,
        scoopPrice: formSoldByScoop ? Number(formScoopPrice) : undefined,
        scoopsPerContainer: formSoldByScoop ? Number(formScoopsPerContainer) : undefined,
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
        soldByScoop: formSoldByScoop,
        scoopPrice: formSoldByScoop ? Number(formScoopPrice) : undefined,
        scoopsPerContainer: formSoldByScoop ? Number(formScoopsPerContainer) : undefined,
      });
    }

    setShowAddProductModal(false);
    setEditingProduct(null);
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
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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

          {/* Botón Imprimir Códigos de Barra */}
          <button
            onClick={() => setShowBarcodePrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gym-surface hover:bg-amber-500/10 text-gray-200 hover:text-amber-400 border border-gym-border hover:border-amber-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Imprimir todos los códigos de barra"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Imprimir Códigos</span>
            <span className="sm:hidden">Códigos</span>
          </button>

          {/* Botón Agregar Nuevo Producto */}
          <button
            onClick={openNewProductModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-glow-gold transition-all cursor-pointer"
            title="Dar de alta un nuevo producto en el catálogo"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Producto</span>
          </button>
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
              onClick={() => { setSelectedCatToEdit(null); setShowCategoryManagerModal(true); }}
              className="px-3.5 py-1.5 rounded-xl bg-gym-surface hover:bg-amber-500/10 text-gray-200 hover:text-amber-400 border border-gym-border hover:border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Editar nombres, emojis y clasificaciones de categorías"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Editar Categorías</span>
            </button>

            <button
              onClick={() => { setSelectedCatToEdit(null); setShowCategoryManagerModal(true); }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Categorías</span>
            </button>

            <button
              onClick={() => setIsCategoriesVisible(!isCategoriesVisible)}
              className="px-3 py-1.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
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
                <div
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all group relative cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-950/80 to-gym-surface border-2 border-amber-500 text-white shadow-glow-gold/20'
                      : 'bg-gym-surface hover:bg-gym-surface/80 border-gym-border text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0 pr-1">
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="font-bold text-xs truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCatToEdit(cat.id);
                        setShowCategoryManagerModal(true);
                      }}
                      className="p-1 rounded-lg bg-gym-card/80 hover:bg-amber-500/20 text-gym-muted hover:text-amber-400 border border-gym-border/40 hover:border-amber-500/30 transition-all opacity-70 group-hover:opacity-100"
                      title={`Editar categoría "${cat.name}"`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-amber-500 text-black' : 'bg-gym-card text-gym-muted'
                    }`}>
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* + Nueva Categoría Dashed Card */}
            <button
              onClick={() => { setSelectedCatToEdit(null); setShowCategoryManagerModal(true); }}
              className="p-3 rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
                      {p.soldByScoop && p.scoopPrice && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          🥄 Scoop: ${p.scoopPrice}
                        </span>
                      )}
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
                  <div className="pt-2.5 border-t border-gym-border/60 flex items-center justify-between text-xs text-gym-muted">
                    <span>Stock: <strong className="text-white">{p.stock} pzas</strong></span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Estás seguro de eliminar "${p.name}"?`)) {
                            deleteProduct(p.id);
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/25 hover:border-red-500/50 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="text-[11px]">Eliminar</span>
                      </button>

                      <span className="text-[11px] text-amber-400 group-hover:underline">
                        Editar datos →
                      </span>
                    </div>
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

                    <td className="p-4 font-mono text-xs">
                      <span className="font-black text-sm text-amber-400 block">${p.price.toFixed(2)} MXN</span>
                      {p.soldByScoop && p.scoopPrice && (
                        <span className="text-[10px] text-amber-300 font-bold block">🥄 Scoop: ${p.scoopPrice}</span>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gym-border flex items-center justify-between bg-gym-surface/40 shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  {editingProduct ? 'Editar Producto del Catálogo' : 'Agregar Nuevo Producto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddProductModal(false); setEditingProduct(null); }}
                className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Apartado de Imagen del Producto: Subir y Eliminar */}
              <div className="bg-gym-surface/40 p-3.5 rounded-xl border border-gym-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white block">
                      Imagen del Producto
                    </label>
                    <p className="text-[11px] text-gym-muted">
                      Sube una fotografía desde tu equipo o elimínala.
                    </p>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={productImageInputRef}
                      onChange={handleProductImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => productImageInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formImage ? 'Cambiar Imagen' : 'Subir Imagen'}</span>
                    </button>

                    {formImage && (
                      <button
                        type="button"
                        onClick={handleRemoveProductImage}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title="Eliminar imagen actual del producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Previsualización de la Imagen */}
                {formImage ? (
                  <div className="flex items-center gap-3 p-2.5 bg-gym-surface/60 rounded-xl border border-gym-border/80">
                    <img
                      src={formImage}
                      alt="Vista previa del producto"
                      className="w-16 h-16 rounded-lg object-cover border border-amber-500/40 shadow-sm shrink-0"
                    />
                    <div className="text-xs space-y-0.5 min-w-0">
                      <span className="font-semibold text-white block truncate">Imagen cargada</span>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3 shrink-0" /> Lista para guardar
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => productImageInputRef.current?.click()}
                    className="border-2 border-dashed border-gym-border hover:border-amber-400/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-gym-surface/20 hover:bg-amber-500/5 group"
                  >
                    <ImageIcon className="w-7 h-7 mx-auto text-gym-muted group-hover:text-amber-400 transition-colors mb-1" />
                    <p className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                      Haz clic para seleccionar o subir una foto
                    </p>
                    <p className="text-[10px] text-gym-muted">Formatos JPG, PNG o WebP</p>
                  </div>
                )}
              </div>

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
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400 font-semibold"
                  >
                    {customCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gym-muted block">Código de Barras</label>
                  <button
                    type="button"
                    onClick={() => setFormBarcode(`${Math.floor(100000000000 + Math.random() * 900000000000)}`)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar aleatorio</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder="748927028669 o escanea aquí..."
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <p className="text-[10px] text-gym-muted mt-1">
                  Puedes escribirlo manualmente, generarlo con el botón o escanear el envase directamente con tu lector.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

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
                <label className="text-xs font-semibold text-gym-muted block mb-1">Descripción Breve</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="24g de proteína de suero por porción..."
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Apartado: Venta por Scoop */}
              <div className="p-3.5 rounded-xl bg-gym-surface/80 border border-gym-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      formSoldByScoop 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                        : 'bg-gym-card text-gym-muted border border-gym-border'
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <label 
                        onClick={() => setFormSoldByScoop(!formSoldByScoop)}
                        className="text-xs font-bold text-white cursor-pointer select-none block"
                      >
                        ¿Se venderá por Scoop / Porción?
                      </label>
                      <p className="text-[11px] text-gym-muted">
                        Habilita la venta de este suplemento en tomas o batidos individuales
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <button
                    type="button"
                    onClick={() => setFormSoldByScoop(!formSoldByScoop)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formSoldByScoop ? 'bg-amber-500' : 'bg-gym-border'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                        formSoldByScoop ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-400'
                      }`}
                    />
                  </button>
                </div>

                {formSoldByScoop && (
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gym-border/60">
                    <div>
                      <label className="text-xs font-semibold text-gym-muted block mb-1">
                        Precio por Scoop ($) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gym-muted text-sm font-bold">$</span>
                        <input
                          type="number"
                          value={formScoopPrice}
                          onChange={(e) => setFormScoopPrice(Number(e.target.value))}
                          placeholder="35"
                          min="1"
                          required={formSoldByScoop}
                          className="w-full pl-7 pr-3 py-2 bg-gym-card rounded-xl border border-gym-border text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gym-muted block mb-1">
                        Scoops por Bote / Envase
                      </label>
                      <input
                        type="number"
                        value={formScoopsPerContainer}
                        onChange={(e) => setFormScoopsPerContainer(Number(e.target.value))}
                        placeholder="30"
                        min="1"
                        className="w-full px-3 py-2 bg-gym-card rounded-xl border border-gym-border text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              </div>

              {/* Pie de modal fijo: Siempre visible sin importar el zoom del navegador */}
              <div className="p-4 border-t border-gym-border bg-gym-surface/80 flex items-center justify-between gap-2 shrink-0">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Estás seguro de eliminar "${editingProduct.name}" del catálogo?`)) {
                        deleteProduct(editingProduct.id);
                        setShowAddProductModal(false);
                        setEditingProduct(null);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Producto</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddProductModal(false); setEditingProduct(null); }}
                    className="px-4 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 text-xs font-semibold text-gym-muted hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-glow-gold transition-all cursor-pointer"
                  >
                    {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: GESTIÓN Y EDICIÓN DE CATEGORÍAS */}
      <CategoryManagerModal
        isOpen={showCategoryManagerModal}
        onClose={() => {
          setShowCategoryManagerModal(false);
          setSelectedCatToEdit(null);
        }}
        categories={customCategories}
        onSaveCategories={handleSaveCategories}
        products={products}
        initialEditingId={selectedCatToEdit}
      />

      {/* 7. MODAL: IMPRESIÓN DE CÓDIGOS DE BARRA */}
      <BarcodePrintModal
        isOpen={showBarcodePrintModal}
        onClose={() => setShowBarcodePrintModal(false)}
        products={products}
        categories={customCategories}
      />

    </div>
  );
};
