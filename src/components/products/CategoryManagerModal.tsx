import React, { useState } from 'react';
import { Product } from '../../types';
import {
  X,
  Layers,
  Edit3,
  Trash2,
  Plus,
  Check,
  Sparkles,
  Tag
} from 'lucide-react';

export interface CatalogCategory {
  id: string;
  name: string;
  icon: string;
}

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CatalogCategory[];
  onSaveCategories: (updated: CatalogCategory[]) => void;
  products: Product[];
  initialEditingId?: string | null;
}

const AVAILABLE_EMOJIS = [
  '🥛', '💥', '🔥', '🥤', '🍫', '🧬', '🏋️', '🏷️',
  '💊', '⚡', '🥗', '🥊', '🍎', '🧴', '🎯', '👕',
  '⭐', '💪', '🏆', '🌿', '💧', '🏃', '🥇', '🧊'
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
  products,
  initialEditingId = null,
}) => {
  // If an initial id is passed, edit that one; otherwise null
  const [editingId, setEditingId] = useState<string | null>(initialEditingId);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('⚡');

  // Form for creating a new category
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('⚡');

  // When opening or changing initialEditingId
  React.useEffect(() => {
    if (initialEditingId) {
      const target = categories.find((c) => c.id === initialEditingId);
      if (target) {
        setEditingId(target.id);
        setEditName(target.name);
        setEditIcon(target.icon);
        setIsCreatingNew(false);
      }
    } else {
      setEditingId(null);
      setEditName('');
    }
  }, [initialEditingId, categories, isOpen]);

  if (!isOpen) return null;

  const getProductCountForCat = (catId: string) => {
    return products.filter((p) => p.category === catId).length;
  };

  const startEditing = (cat: CatalogCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setIsCreatingNew(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;

    const updated = categories.map((cat) => {
      if (cat.id === editingId) {
        return {
          ...cat,
          name: editName.trim(),
          icon: editIcon,
        };
      }
      return cat;
    });

    onSaveCategories(updated);
    setEditingId(null);
    setEditName('');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newId = newName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || `cat_${Date.now()}`;

    // Avoid duplicate id
    const finalId = categories.some((c) => c.id === newId)
      ? `${newId}_${Date.now().toString().slice(-4)}`
      : newId;

    const updated = [
      ...categories,
      {
        id: finalId,
        name: newName.trim(),
        icon: newIcon,
      },
    ];

    onSaveCategories(updated);
    setNewName('');
    setIsCreatingNew(false);
  };

  const handleDeleteCategory = (cat: CatalogCategory) => {
    const count = getProductCountForCat(cat.id);
    const warning = count > 0
      ? `La categoría "${cat.name}" tiene ${count} producto(s) vinculado(s).\n¿Estás seguro de que deseas eliminarla?`
      : `¿Estás seguro de eliminar la categoría "${cat.name}"?`;

    if (confirm(warning)) {
      const updated = categories.filter((c) => c.id !== cat.id);
      onSaveCategories(updated);
      if (editingId === cat.id) {
        setEditingId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gym-border flex items-center justify-between bg-gym-surface/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Editar y Gestionar Categorías
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                  {categories.length} activas
                </span>
              </div>
              <p className="text-xs text-gym-muted">
                Modifica nombres, emojis o administra las clasificaciones del catálogo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* 1. SECCIÓN: EDITAR CATEGORÍA SELECCIONADA */}
          {editingId && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span className="font-black text-xs uppercase tracking-wider text-amber-300">
                    Editando Categoría:
                  </span>
                  <span className="text-sm font-bold text-white">
                    {editIcon} {editName || 'Sin nombre'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="text-xs text-gym-muted hover:text-white font-semibold underline"
                >
                  Cancelar edición
                </button>
              </div>

              <form onSubmit={handleUpdateCategory} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-gym-muted block mb-1">
                      Nombre de la Categoría *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gym-muted block mb-1">
                      Icono seleccionado
                    </label>
                    <div className="h-10 px-3 bg-gym-surface rounded-xl border border-gym-border flex items-center justify-center text-xl">
                      {editIcon}
                    </div>
                  </div>
                </div>

                {/* Emoji Selector */}
                <div>
                  <label className="text-[11px] font-bold text-gym-muted block mb-1.5">
                    Elige un nuevo emoji / icono:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditIcon(emoji)}
                        className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all ${
                          editIcon === emoji
                            ? 'bg-amber-500 text-black border-amber-400 font-bold scale-110 shadow-sm'
                            : 'bg-gym-surface hover:bg-gym-surface/80 border-gym-border text-white'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="px-3.5 py-1.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 text-xs font-semibold text-gym-muted hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-glow-gold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. SECCIÓN: CREAR NUEVA CATEGORÍA (EXPANDIBLE) */}
          {isCreatingNew && !editingId && (
            <div className="bg-gym-surface/50 border border-gym-border rounded-2xl p-4 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span className="font-black text-xs uppercase tracking-wider text-white">
                    Nueva Categoría
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-gym-muted hover:text-white underline"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-gym-muted block mb-1">
                      Nombre de la Nueva Categoría *
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ej. Barras Energéticas & Snacks"
                      className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gym-muted block mb-1">
                      Icono
                    </label>
                    <div className="h-10 px-3 bg-gym-surface rounded-xl border border-gym-border flex items-center justify-center text-xl">
                      {newIcon}
                    </div>
                  </div>
                </div>

                {/* Emoji Selector */}
                <div>
                  <label className="text-[11px] font-bold text-gym-muted block mb-1.5">
                    Selecciona un icono:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewIcon(emoji)}
                        className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all ${
                          newIcon === emoji
                            ? 'bg-amber-500 text-black border-amber-400 font-bold scale-110 shadow-sm'
                            : 'bg-gym-surface hover:bg-gym-surface/80 border-gym-border text-white'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gym-border">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-gym-surface text-xs font-semibold text-gym-muted hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Crear Categoría</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. LISTADO DE CATEGORÍAS EXISTENTES */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-gym-muted">
                Listado de Categorías ({categories.length}):
              </span>

              {!isCreatingNew && !editingId && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar otra categoría</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map((cat) => {
                const count = getProductCountForCat(cat.id);
                const isCurrentEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isCurrentEditing
                        ? 'bg-amber-500/15 border-amber-500 shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-gym-surface/40 hover:bg-gym-surface border-gym-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="text-xl shrink-0 p-1.5 rounded-lg bg-gym-card border border-gym-border">
                        {cat.icon}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-white block truncate">
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gym-muted">
                          <span className="font-mono text-gray-400">{cat.id}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold font-mono">
                            {count} producto{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones: Editar y Eliminar */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditing(cat)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                          isCurrentEditing
                            ? 'bg-amber-500 text-black font-extrabold'
                            : 'bg-gym-card hover:bg-amber-500/20 text-gym-muted hover:text-amber-400 border border-gym-border'
                        }`}
                        title="Editar nombre e icono"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[11px] hidden sm:inline">Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg bg-gym-card hover:bg-red-500/20 text-gym-muted hover:text-red-400 border border-gym-border hover:border-red-500/30 transition-colors"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-gym-border bg-gym-surface/80 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-gym-muted">
            Los cambios se reflejarán inmediatamente en todo el catálogo y filtros.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gym-surface hover:bg-gym-surface/80 text-xs font-semibold text-white border border-gym-border transition-colors cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
