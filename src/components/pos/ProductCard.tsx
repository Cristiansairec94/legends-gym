import React, { useState } from 'react';
import { Product } from '../../types';
import { useGym } from '../../context/GymContext';
import { Barcode, Package, Plus } from 'lucide-react';
import { sounds } from '../../services/audio';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, cart } = useGym();
  const [imageError, setImageError] = useState(false);

  const cartItem = cart.find(i => i.product.id === product.id);
  const qtyInCart = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock <= product.minStock && !isOutOfStock;

  const handleCardClick = () => {
    if (!isOutOfStock) {
      addToCart(product, 1);
      sounds.playBarcodeBeep();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer select-none group relative backdrop-blur-md ${
        isOutOfStock
          ? 'bg-[#0c0d13]/80 opacity-50 border-white/[0.06] cursor-not-allowed'
          : qtyInCart > 0
          ? 'bg-gradient-to-b from-[#161822]/95 via-[#0f1017]/96 to-[#090a0f]/98 border-amber-400/75 ring-1 ring-amber-400/30 shadow-[0_10px_28px_rgba(245,158,11,0.18)] -translate-y-0.5'
          : 'bg-gradient-to-b from-[#141620]/90 via-[#0d0e15]/94 to-[#090a0f]/96 border-white/[0.1] hover:border-amber-400/65 hover:shadow-[0_12px_30px_rgba(0,0,0,0.75),0_0_20px_rgba(245,158,11,0.14)] hover:-translate-y-0.5'
      }`}
    >
      {/* Subtle Top Specular Hairline */}
      <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 group-hover:via-amber-300/70 to-transparent pointer-events-none z-20 transition-all" />

      {/* Product Image Stage */}
      <div className="relative h-28 w-full bg-[#0b0c12] overflow-hidden shrink-0">
        {imageError || !product.image ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#191b24] via-[#111219] to-[#0a0b10] p-2 text-center">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1 shadow-inner">
              <Package className="w-4.5 h-4.5" />
            </div>
            <span className="text-[9px] font-black text-zinc-400 tracking-widest uppercase truncate max-w-[90%]">
              {product.brand || 'LEGENDS'}
            </span>
          </div>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}

        {/* Smooth Cinema Vignette for crisp badge contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c13] via-black/10 to-black/35 pointer-events-none" />

        {/* Floating Gold Price Pill (Top Right) */}
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 text-black font-black font-mono text-xs px-2.5 py-0.5 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.75)] border border-amber-200/70 tracking-tight inline-flex items-baseline gap-0.5">
            <span>${product.price.toFixed(2)}</span>
          </span>
        </div>

        {/* Floating Availability / Stock Pill (Bottom Left) */}
        <div className="absolute bottom-2 left-2 z-10">
          {isOutOfStock ? (
            <span className="bg-red-500/90 text-white font-black text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-lg shadow backdrop-blur-md border border-red-300/40">
              Agotado
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-400 text-black font-black text-[9.5px] px-2 py-0.5 rounded-lg shadow backdrop-blur-md border border-amber-200 animate-pulse">
              Pocas • {product.stock}
            </span>
          ) : (
            <span className="bg-black/80 text-emerald-400 font-bold text-[9.5px] px-2 py-0.5 rounded-lg shadow backdrop-blur-md border border-emerald-500/35 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
              <span>Disponible</span>
              <span className="text-zinc-400 font-mono text-[9px]">({product.stock})</span>
            </span>
          )}
        </div>

        {/* Active Cart Quantity Badge (Top Left) */}
        {qtyInCart > 0 && (
          <div className="absolute top-2 left-2 z-10 px-2 h-6 rounded-full bg-amber-400 text-black font-black font-mono text-[11px] flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.65)] border-2 border-black">
            ×{qtyInCart}
          </div>
        )}
      </div>

      {/* Card Body & Uniform Footer */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400/80 block truncate">
            {product.brand || 'Suplementos'}
          </span>
          <h3 className="font-extrabold text-xs sm:text-[13px] text-white line-clamp-1 group-hover:text-amber-300 transition-colors leading-snug mt-0.5">
            {product.name}
          </h3>
          <p className="text-[10.5px] text-zinc-400 line-clamp-1 mt-0.5">
            {product.flavor ? `${product.flavor} • ` : ''}
            {product.description}
          </p>
        </div>

        {/* Clean Single-Row Footer: Barcode Chip + Tactile Add Pill */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.07] flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 bg-black/60 group-hover:bg-black/80 border border-white/[0.08] group-hover:border-amber-500/30 px-2 py-0.5 rounded-lg text-[9.5px] font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors min-w-0">
            <Barcode className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="tracking-tight truncate">{product.barcode}</span>
          </div>

          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
              qtyInCart > 0
                ? 'bg-amber-400 text-black border-amber-300 shadow-sm'
                : 'bg-amber-400/10 text-amber-400 border-amber-400/25 group-hover:bg-amber-400 group-hover:text-black group-hover:border-amber-300'
            }`}
            title="Añadir al ticket"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
          </div>
        </div>
      </div>
    </div>
  );
};
