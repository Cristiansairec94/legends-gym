import React, { useState } from 'react';
import { Product } from '../../types';
import { useGym } from '../../context/GymContext';
import { Barcode, Package } from 'lucide-react';
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
      className={`bg-gradient-to-b from-[#161720] to-[#101117] rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer select-none group relative shadow-md ${
        isOutOfStock 
          ? 'opacity-50 border-white/[0.06] cursor-not-allowed' 
          : 'border-white/[0.08] hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-0.5'
      }`}
    >
      {/* Product Image Box */}
      <div className="relative h-24 sm:h-28 w-full bg-gym-surface overflow-hidden">
        {imageError || !product.image ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1b24] via-[#12131a] to-[#0c0d12] p-2 text-center">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-1">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-zinc-400 tracking-wider uppercase truncate max-w-[90%]">
              {product.brand || 'Legends'}
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

        {/* Ambient Dark Gradient on bottom of image for badge legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101117] via-transparent to-black/25 pointer-events-none" />

        {/* Floating Price Pill (Top Right) */}
        <div className="absolute top-1.5 right-1.5 z-10">
          <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-md border border-amber-300/50 tracking-tight">
            ${product.price.toFixed(2)} <span className="text-[9px] font-bold text-black/75">/pz</span>
          </span>
        </div>

        {/* Floating Stock/Availability Pill (Bottom Left) */}
        <div className="absolute bottom-1.5 left-1.5 z-10">
          {isOutOfStock ? (
            <span className="bg-red-500/90 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md shadow backdrop-blur-sm border border-red-400/40">
              Agotado
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-400 text-black font-black text-[9px] px-2 py-0.5 rounded-md shadow backdrop-blur-sm border border-amber-300 animate-pulse">
              Pocas ({product.stock})
            </span>
          ) : (
            <span className="bg-black/75 text-emerald-400 font-bold text-[9px] px-2 py-0.5 rounded-md shadow backdrop-blur-sm border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Disponible
            </span>
          )}
        </div>

        {/* In-cart count badge if added (Top Left) */}
        {qtyInCart > 0 && (
          <div className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full bg-amber-400 text-black font-black text-[11px] flex items-center justify-center shadow-glow-gold border-2 border-[#101117] ring-1 ring-amber-300">
            {qtyInCart}
          </div>
        )}
      </div>

      {/* Product Info & Barcode Footer */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:text-amber-400 transition-colors leading-snug">
            {product.name}
          </h3>
          <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5 font-medium">
            {product.flavor ? `${product.flavor} • ` : ''}{product.description}
          </p>
        </div>

        {/* Footer row: Price on left, Barcode pill on right */}
        <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex items-center justify-between gap-1">
          <div>
            <span className="font-bold text-xs font-mono text-white block">
              ${product.price.toFixed(2)} <span className="text-[9px] text-zinc-500 font-normal">/pz</span>
            </span>
            {product.soldByScoop && product.scoopPrice && (
              <span className="text-[9px] text-amber-400 font-bold font-mono block">
                🥄 Scoop: ${product.scoopPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Barcode pill */}
          <div className="flex items-center gap-1 bg-white/[0.04] group-hover:bg-amber-500/10 border border-white/[0.08] group-hover:border-amber-500/30 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 group-hover:text-amber-300 transition-colors shrink-0">
            <Barcode className="w-3 h-3 text-amber-400" />
            <span className="tracking-tighter truncate max-w-[70px]">{product.barcode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
