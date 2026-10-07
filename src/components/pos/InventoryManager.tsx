import React, { useState } from 'react';
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
  Trash2
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const { products, addProduct, adjustStock, deleteProduct, currentRole } = useGym();

  const [search, setSearch] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New product form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('protein');
  const [price, setPrice] = useState(500);
  const [costPrice, setCostPrice] = useState(350);
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(4);
  const [image, setImage] = useState('https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=400&q=80');
  const [flavor, setFlavor] = useState('');
  const [description, setDescription] = useState('');

  // Calculations
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalRetailValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
  const totalCostValue = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesLowStock = !filterLowStockOnly || p.stock <= p.minStock;
    return matchesSearch && matchesLowStock;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProduct({
      name: name.trim(),
      brand: brand.trim() || 'Legends Nutrition',
      category,
      price: Number(price),
      costPrice: Number(costPrice),
      stock: Number(stock),
      minStock: Number(minStock),
      image: image.trim() || 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=400&q=80',
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      description: description.trim() || 'Suplemento nutricional de alto rendimiento para deportistas.',
      flavor: flavor.trim() || undefined,
    });

    setShowAddModal(false);
    setName('');
    setBrand('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gym-card p-5 rounded-2xl border border-gym-border shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black text-white tracking-wide uppercase">
              Control de Inventario & Almacén
            </h1>
          </div>
          <p className="text-sm text-gym-muted mt-1">
            Gestión de existencias de suplementos, costos, márgenes y alertas de reabastecimiento.
          </p>
        </div>

        {currentRole === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-glow-gold transition-all"
          >
            <PackagePlus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <span className="text-xs text-gym-muted block">Unidades en Almacén</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalStockUnits}</span>
          <span className="text-[11px] text-gray-400 mt-0.5 block">{products.length} productos registrados</span>
        </div>

        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <span className="text-xs text-amber-400 font-semibold block">Valor a Precio Venta</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">
            ${totalRetailValue.toLocaleString()} MXN
          </span>
          <span className="text-[11px] text-gym-muted mt-0.5 block">Ingreso proyectado</span>
        </div>

        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <span className="text-xs text-blue-400 font-semibold block">Costo de Inversión</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block font-mono">
            ${totalCostValue.toLocaleString()} MXN
          </span>
          <span className="text-[11px] text-emerald-400 mt-0.5 block">
            Margen: +${(totalRetailValue - totalCostValue).toLocaleString()} MXN
          </span>
        </div>

        <div 
          onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            lowStockCount > 0 
              ? 'bg-red-500/10 border-red-500/40 hover:bg-red-500/20' 
              : 'bg-gym-card border-gym-border'
          }`}
        >
          <span className="text-xs text-red-400 font-bold block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Stock Bajo / Reorden
          </span>
          <span className="text-2xl font-black text-red-400 mt-1 block">{lowStockCount}</span>
          <span className="text-[11px] text-gray-300 mt-0.5 block">
            {filterLowStockOnly ? 'Mostrando sólo alertas' : 'Haz clic para filtrar alertas'}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-gym-card p-4 rounded-2xl border border-gym-border flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            className="w-full pl-9 pr-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
          />
        </div>

        {filterLowStockOnly && (
          <button
            onClick={() => setFilterLowStockOnly(false)}
            className="text-xs text-red-400 hover:underline font-bold"
          >
            Quitar filtro de stock bajo
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gym-border bg-gym-surface/40 text-[11px] font-bold uppercase tracking-wider text-gym-muted">
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Costo / Venta</th>
                <th className="p-4">Stock Actual</th>
                <th className="p-4 text-center">Ajuste Rápido de Stock</th>
                {currentRole === 'admin' && <th className="p-4 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40 text-sm">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= p.minStock;

                return (
                  <tr key={p.id} className="hover:bg-gym-surface/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover border border-gym-border shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{p.name}</div>
                          <div className="text-[11px] text-gym-muted font-mono">{p.brand} • {p.flavor || 'Original'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gym-surface text-gray-300 border border-gym-border capitalize">
                        {p.category}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-xs">
                      <span className="text-gym-muted line-through block text-[10px]">Costo: ${p.costPrice}</span>
                      <span className="text-amber-400 font-bold text-sm block">Venta: ${p.price} MXN</span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black font-mono px-2.5 py-1 rounded-lg ${
                          isLow 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                            : 'bg-gym-surface text-white'
                        }`}>
                          {p.stock}
                        </span>
                        {isLow && (
                          <span className="text-[10px] text-red-400 font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Mín: {p.minStock}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-gym-surface p-1 rounded-xl border border-gym-border">
                        <button
                          onClick={() => adjustStock(p.id, -1)}
                          className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-card"
                          title="Restar 1 unidad"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => adjustStock(p.id, 1)}
                          className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-card"
                          title="Sumar 1 unidad"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => adjustStock(p.id, 5)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-amber-400 hover:bg-gym-card"
                          title="Sumar lote (+5)"
                        >
                          +5
                        </button>
                      </div>
                    </td>

                    {currentRole === 'admin' && (
                      <td className="p-4 text-right">
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
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-lg overflow-hidden shadow-2xl relative my-6">
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Agregar Suplemento al Catálogo</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gym-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Nombre del Suplemento *</label>
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
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ej. Mutant"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="protein">Proteínas</option>
                    <option value="creatine">Creatinas</option>
                    <option value="preworkout">Pre-entreno</option>
                    <option value="aminoacids">Aminoácidos</option>
                    <option value="beverage">Bebidas</option>
                    <option value="snack">Snacks</option>
                    <option value="gear">Accesorios</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Costo ($)</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">URL de Imagen del Producto</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Sabor / Presentación</label>
                <input
                  type="text"
                  value={flavor}
                  onChange={(e) => setFlavor(e.target.value)}
                  placeholder="Ej. Fresa Plátano • 60 servicios"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-xs font-semibold text-gym-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
