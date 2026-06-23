"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";

export function ProductClient({ product }: { product: any }) {
  const { addItem } = useCartStore();
  const [currentImage, setCurrentImage] = useState(0);

  const handleBuy = () => {
    addItem({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      imageUrl: product.images && product.images.length > 0 ? product.images[0] : undefined,
      weight: product.weight,
      width: product.width,
      height: product.height,
      length: product.length
    });
  };

  return (
    <div className="flex flex-col gap-8 bg-[var(--color-loja-surface)] p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm relative z-20">
      {/* Image Gallery */}
      <div className="flex flex-col gap-3">
        <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[currentImage]} 
              alt={product.name} 
              className="w-full h-full object-cover transition-all duration-500" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-loja-muted)]">
              Sem Imagem
            </div>
          )}
        </div>
        
        {/* Thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {product.images.map((img: string, idx: number) => (
              <button 
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${currentImage === idx ? 'border-[var(--color-loja-cta)] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="flex flex-col gap-5">
        <div>
          {product.category && (
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-loja-muted)] mb-2 block">
              {product.category}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-loja-text)] leading-tight">
            {product.name}
          </h1>
          <p className="text-xl sm:text-2xl font-medium text-[var(--color-loja-text)] mt-3">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
          </p>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleBuy}
          className="w-full py-4 mt-2 bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] rounded-xl font-extrabold text-lg shadow-md hover:scale-[1.01] active:scale-[0.98] transition-transform"
        >
          Adicionar ao Carrinho
        </button>

        {/* Description */}
        {product.description && (
          <div className="mt-4 pt-6 border-t border-gray-200">
            <h2 className="text-xs font-bold text-[var(--color-loja-text)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-4 h-[2px] bg-[var(--color-loja-text)] inline-block"></span> 
              Sobre o Produto
            </h2>
            <div className="text-[var(--color-loja-muted)] text-sm leading-relaxed whitespace-pre-wrap">
              {product.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
