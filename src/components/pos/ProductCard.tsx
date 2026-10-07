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
      className={`bg-gym-card rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer select-none group relative ${
        isOutOfStock 
          ? 'opacity-50 border-gym-border cursor-not-allowed' 
          : 'border-gym-border hover:border-amber-400 hover:shadow-glow-gold/20 hover:-translate-y-0.5'
      }`}
    >
      {/* Product Image Box */}
      <div className="relative h-36 w-full bg-gym-surface overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Floating Price Pill (Top-Right as in screenshot) */}
        <div className="absolute top-2 right-2">
          <span className="bg-gradient-to-r from-amber-600 to-amber-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-md">
            ${product.price.toFixed(2)} /pz
          </span>
        </div>

        {/* Floating Stock/Availability Pill (Bottom-Left as in screenshot) */}
        <div className="absolute bottom-2 left-2">
          {isOutOfStock ? (
            <span className="bg-red-600/90 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow backdrop-blur-sm">
              Agotado
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-600/90 text-black font-bold text-[10px] px-2 py-0.5 rounded-md shadow backdrop-blur-sm animate-pulse">
              Pocas piezas ({product.stock})
            </span>
          ) : (
            <span className="bg-black/75 text-gray-200 font-bold text-[10px] px-2 py-0.5 rounded-md shadow backdrop-blur-sm">
              Disponible
            </span>
          )}
        </div>

        {/* In-cart count badge if added */}
        {qtyInCart > 0 && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center shadow-glow-gold animate-bounce">
            {qtyInCart}
          </div>
        )}
      </div>

      {/* Product Info & Barcode Footer */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
            {product.name}
          </h3>
          <p className="text-[11px] text-gym-muted line-clamp-1 mt-0.5">
            {product.flavor ? `${product.flavor} • ` : ''}{product.description}
          </p>
        </div>

        {/* Footer row as in screenshot: Price on left, Barcode pill on right */}
        <div className="mt-3 pt-2.5 border-t border-gym-border/70 flex items-center justify-between gap-1">
          <span className="font-bold text-sm font-mono text-white">
            ${product.price.toFixed(2)} <span className="text-[10px] text-gym-muted font-normal">/pz</span>
          </span>

          {/* Barcode pill matching the image */}
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md text-[10px] font-mono text-amber-300">
            <Barcode className="w-3.5 h-3.5 text-amber-400" />
            <span className="tracking-tighter truncate max-w-[85px]">{product.barcode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
