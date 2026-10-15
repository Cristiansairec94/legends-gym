import React from 'react';
import { Product } from '../../types';
import { useGym } from '../../context/GymContext';
import { Barcode, Plus, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, cart } = useGym();

  const cartItem = cart.find(i => i.product.id === product.id);
  const qtyInCart = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock <= product.minStock && !isOutOfStock;

  return (
    <div 
      onClick={() => !isOutOfStock && addToCart(product, 1)}
      className={`bg-gym-card rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer select-none group relative shadow-sm ${
        isOutOfStock 
          ? 'opacity-50 border-gym-border cursor-not-allowed' 
          : 'border-gym-border hover:border-amber-400 hover:shadow-glow-gold/20 hover:-translate-y-0.5'
      }`}
    >
      {/* Product Image Box */}
      <div className="relative h-24 sm:h-26 w-full bg-gym-surface overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Floating Price Pill */}
        <div className="absolute top-1.5 right-1.5">
          <span className="bg-gradient-to-r from-amber-600 to-amber-500 text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-md">
            ${product.price.toFixed(2)} /pz
          </span>
        </div>

        {/* Floating Stock/Availability Pill */}
        <div className="absolute bottom-1.5 left-1.5">
          {isOutOfStock ? (
            <span className="bg-red-600/90 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow backdrop-blur-sm">
              Agotado
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-600/90 text-black font-bold text-[9px] px-1.5 py-0.5 rounded shadow backdrop-blur-sm animate-pulse">
              Pocas ({product.stock})
            </span>
          ) : (
            <span className="bg-black/75 text-gray-200 font-bold text-[9px] px-1.5 py-0.5 rounded shadow backdrop-blur-sm">
              Disponible
            </span>
          )}
        </div>

        {/* In-cart count badge if added */}
        {qtyInCart > 0 && (
          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-amber-500 text-black font-black text-[10px] flex items-center justify-center shadow-glow-gold animate-bounce">
            {qtyInCart}
          </div>
        )}
      </div>

      {/* Product Info & Barcode Footer */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
            {product.name}
          </h3>
          <p className="text-[10px] text-gym-muted line-clamp-1 mt-0.5">
            {product.flavor ? `${product.flavor} • ` : ''}{product.description}
          </p>
        </div>

        {/* Footer row: Price on left, Barcode pill on right */}
        <div className="mt-2 pt-1.5 border-t border-gym-border/70 flex items-center justify-between gap-1">
          <div>
            <span className="font-bold text-xs font-mono text-white block">
              ${product.price.toFixed(2)} <span className="text-[9px] text-gym-muted font-normal">/pz</span>
            </span>
            {product.soldByScoop && product.scoopPrice && (
              <span className="text-[9px] text-amber-400 font-bold font-mono block">
                🥄 Scoop: ${product.scoopPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Barcode pill */}
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded text-[9px] font-mono text-amber-300 shrink-0">
            <Barcode className="w-3 h-3 text-amber-400" />
            <span className="tracking-tighter truncate max-w-[70px]">{product.barcode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
