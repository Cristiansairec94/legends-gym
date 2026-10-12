import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '../../types';
import { BarcodeSVG } from './BarcodeSVG';
import { CatalogCategory } from './CategoryManagerModal';
import {
  X,
  Printer,
  Layers,
  LayoutGrid,
  Columns,
  FileText,
  Search,
} from 'lucide-react';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories?: CatalogCategory[];
}

type DesignMode = 'etiquetas_3col' | 'etiquetas_4col' | 'mostrador';

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  products,
  categories = [],
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    products.map((p) => p.id)
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [designMode, setDesignMode] = useState<DesignMode>('etiquetas_3col');
  const [search, setSearch] = useState('');

  // Keep selection up-to-date if products list changes
  useEffect(() => {
    setSelectedIds(products.map((p) => p.id));
  }, [products]);

  // Set printing class on body when modal is open so @media print starts cleanly at (0,0) of page 1
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('is-printing-barcodes');
      return () => {
        document.body.classList.remove('is-printing-barcodes');
      };
    }
  }, [isOpen]);

  // Helper map for category icons and display names
  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string }>();
    categories.forEach((cat) => {
      map.set(cat.id, { name: cat.name, icon: cat.icon });
    });
    return map;
  }, [categories]);

  const getCategoryInfo = (catId: string) => {
    const found = categoryMap.get(catId);
    if (found) return found;
    return { name: catId, icon: '🏷️' };
  };

  // Unique categories list with counts for the dropdown
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    });

    const list: { id: string; name: string; icon: string; count: number }[] = [];
    counts.forEach((count, catId) => {
      const info = getCategoryInfo(catId);
      list.push({
        id: catId,
        name: info.name,
        icon: info.icon,
        count,
      });
    });

    return list.sort((a, b) => b.count - a.count);
  }, [products, categoryMap]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, search]);

  // Selected products to print
  const productsToPrint = useMemo(() => {
    return filteredProducts.filter((p) => selectedIds.includes(p.id));
  }, [filteredProducts, selectedIds]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    const currentFilteredIds = filteredProducts.map((p) => p.id);
    const allSelected = currentFilteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto print-modal-overlay">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden border border-gray-800 print-modal-container">
        
        {/* Dark Header (matching reference design) */}
        <div className="p-4 sm:p-5 bg-[#0f1115] border-b border-gray-800 flex items-center justify-between shrink-0 print:hidden text-white">
          <div className="flex items-center gap-3">
            {/* Orange rounded printer badge */}
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-black shadow-md shadow-amber-500/20 shrink-0">
              <Printer className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                  Imprimir Códigos de Barras
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  TODAS LAS CATEGORÍAS O POR SELECCIÓN
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Imprime hojas de códigos de barra para exhibidores, mostrador o la caja de cobro.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Controls Bar (Clean White Background) */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-500" />
              Categoría:
            </span>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:border-amber-500 cursor-pointer min-w-[220px]"
            >
              <option value="all">
                📦 Todas las Categorías ({products.length} productos)
              </option>
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name} ({cat.count} {cat.count === 1 ? 'producto' : 'productos'})
                </option>
              ))}
            </select>

            {/* Quick search input */}
            <div className="relative min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Design Mode Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-500">Diseño:</span>
            
            <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/80 gap-1">
              {/* Etiquetas (3 col) */}
              <button
                onClick={() => setDesignMode('etiquetas_3col')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                  designMode === 'etiquetas_3col'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
                title="3 Columnas - Formato vertical estándar"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Etiquetas (3 col)</span>
              </button>

              {/* Etiquetas (4 col) */}
              <button
                onClick={() => setDesignMode('etiquetas_4col')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                  designMode === 'etiquetas_4col'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
                title="4 Columnas - Ideal para horizontal / Brother"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Etiquetas (4 col)</span>
              </button>

              {/* Catálogo Mostrador */}
              <button
                onClick={() => setDesignMode('mostrador')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                  designMode === 'mostrador'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
                title="Hoja compacta para mostrador / caja de cobro"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Catálogo Mostrador</span>
              </button>
            </div>
          </div>

        </div>

        {/* Subheader: Preview Count + Formato Carta Badge */}
        <div className="px-5 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">
              Vista previa ({productsToPrint.length} {productsToPrint.length === 1 ? 'producto' : 'productos'}):
            </span>

            <button
              onClick={toggleSelectAll}
              className="text-[11px] text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
            >
              {productsToPrint.length === filteredProducts.length
                ? 'Deseleccionar todos'
                : `Seleccionar todos (${filteredProducts.length})`}
            </button>
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-extrabold text-[11px] shadow-xs">
            Formato Carta / A4 optimizado
          </span>
        </div>

        {/* Content Area (Light Gray Preview Background) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#f8f9fa] print-modal-scroll">
          
          {productsToPrint.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <Printer className="w-12 h-12 mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">No hay productos seleccionados para imprimir</p>
              <button
                onClick={() => setSelectedIds(products.map((p) => p.id))}
                className="text-xs text-amber-600 underline font-bold cursor-pointer"
              >
                Seleccionar todos los productos
              </button>
            </div>
          ) : designMode === 'mostrador' ? (
            /* CATÁLOGO MOSTRADOR VIEW (Compact 2-column desk binder sheet) */
            <div
              id="printable-barcodes"
              className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2 w-full"
            >
              {productsToPrint.map((product) => {
                const info = getCategoryInfo(product.category);

                return (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className="barcode-label-card bg-white rounded-xl border border-gray-200 p-2.5 shadow-xs hover:border-amber-400 transition-all flex items-center justify-between gap-3 select-none cursor-pointer print:p-2 print:h-[22mm]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg p-1 rounded-lg bg-amber-50 border border-amber-200/60 shrink-0">
                        {info.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[9px] uppercase font-black tracking-wider text-[#b45309]">
                          {info.name}
                        </div>
                        <h4 className="font-extrabold text-xs text-gray-900 leading-snug truncate" title={product.name}>
                          {product.name}
                        </h4>
                        <div className="text-[9.5px] text-gray-500 font-mono">
                          {product.sku || `#${product.id}`} {product.flavor ? `• ${product.flavor}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="font-black text-xs text-amber-600">
                        ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="bg-gray-50 rounded-lg p-1 border border-gray-100 flex items-center justify-center">
                        <BarcodeSVG
                          value={product.barcode}
                          height={22}
                          fontSize={8}
                          showText={true}
                          className="w-24 max-h-7"
                          barColor="#000000"
                          textColor="#000000"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ETIQUETAS GRID VIEW (Matching exact design in image) */
            <div
              id="printable-barcodes"
              className={`grid w-full ${
                designMode === 'etiquetas_4col'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2.5'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3'
              }`}
            >
              {productsToPrint.map((product) => {
                const info = getCategoryInfo(product.category);

                return (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`barcode-label-card bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 hover:shadow-md hover:border-amber-400 transition-all flex flex-col items-center justify-between text-center select-none cursor-pointer relative ${
                      designMode === 'etiquetas_4col'
                        ? 'print:h-[42mm] print:p-2'
                        : 'print:h-[50mm] print:p-3'
                    }`}
                  >
                    {/* Header: Category Emoji + Gym Name */}
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#b45309] flex items-center justify-center gap-1.5 mb-1 max-w-full truncate">
                      <span>{info.icon}</span>
                      <span>LEGENDS FITNESS CLUB</span>
                    </div>

                    {/* Product Name */}
                    <h4
                      className="font-extrabold text-sm text-gray-900 leading-snug line-clamp-1 max-w-full px-1"
                      title={product.name}
                    >
                      {product.name}
                    </h4>

                    {/* Product Price */}
                    <div className="text-base font-black text-[#d97706] tracking-tight my-1">
                      ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>

                    {/* Barcode Box (Light Gray Container matching image) */}
                    <div className="w-full bg-[#f8f9fa] rounded-xl p-2.5 border border-gray-100 flex flex-col items-center justify-center mt-1">
                      <BarcodeSVG
                        value={product.barcode}
                        height={designMode === 'etiquetas_4col' ? 26 : 30}
                        fontSize={8.5}
                        showText={true}
                        className="w-full max-h-11"
                        barColor="#000000"
                        textColor="#000000"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer (Clean White with Cerrar & Orange Print Button) */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex items-center justify-between shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            onClick={handlePrint}
            disabled={productsToPrint.length === 0}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>IMPRIMIR {productsToPrint.length} CÓDIGOS</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
