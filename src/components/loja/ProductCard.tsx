"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  images?: string[];
}

export function ProductCard({ id, name, price, images }: ProductCardProps) {
  const { addItem } = useCartStore();
  const [currentImage, setCurrentImage] = useState(0);

  const handleBuy = () => {
    addItem({ id, name, price, imageUrl: images && images.length > 0 ? images[0] : undefined });
  };

  return (
    <div className="flex flex-col gap-3 w-full group relative">
      <Link href={`/loja/produto/${id}`} className="absolute inset-0 z-0" aria-label={`Ver detalhes de ${name}`} />
      
      {/* Product Image Area */}
      <div className="aspect-square w-full bg-[var(--color-loja-surface)] rounded-md overflow-hidden relative border border-gray-100">
        <Link href={`/loja/produto/${id}`} className="absolute inset-0 z-10" />
        {images && images.length > 0 ? (
          <>
            <img 
              src={images[currentImage]} 
              alt={`${name} - Imagem ${currentImage + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 w-full flex justify-center gap-1.5 z-20 pointer-events-auto">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentImage(idx);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${currentImage === idx ? 'bg-[var(--color-loja-cta)] w-4' : 'bg-white/70 hover:bg-white'}`}
                    aria-label={`Ver imagem ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-loja-muted)]">
            <span className="text-sm">Sem Imagem</span>
          </div>
        )}
      </div>

      {/* Product Info & Action */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <h3 className="font-semibold text-base leading-tight text-[var(--color-loja-text)]">{name}</h3>
          <p className="text-sm font-medium text-[var(--color-loja-muted)] mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
          </p>
        </div>
        <button 
          onClick={handleBuy}
          className="bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] px-4 py-2 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-transform relative z-20"
        >
          Comprar
        </button>
      </div>
    </div>
  );
}
