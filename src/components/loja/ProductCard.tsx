"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  images?: string[];
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  supplier_id?: string | null;
  free_shipping?: boolean;
  stock?: number;
}

export function ProductCard({
  id,
  name,
  price,
  images,
  weight,
  width,
  height,
  length,
  supplier_id,
  free_shipping,
  stock,
}: ProductCardProps) {
  const { addItem } = useCartStore();
  const [currentImage, setCurrentImage] = useState(0);
  const outOfStock = Number(stock ?? 0) <= 0;

  const handleBuy = () => {
    if (outOfStock) return;
    addItem({
      id,
      name,
      price,
      imageUrl: images && images.length > 0 ? images[0] : undefined,
      weight,
      width,
      height,
      length,
      supplier_id,
    });
  };

  return (
    <div className="flex flex-col gap-3 w-full group relative">
      <Link href={`/produto/${id}`} className="absolute inset-0 z-0" aria-label={`Ver detalhes de ${name}`} />
      
      <div className="aspect-square w-full bg-[var(--color-loja-surface)] rounded-md overflow-hidden relative border border-gray-100">
        <Link href={`/produto/${id}`} className="absolute inset-0 z-10" />
        {outOfStock ? (
          <span className="absolute top-3 left-3 z-20 bg-red-600 text-white text-xs uppercase font-extrabold tracking-wide px-3 py-1.5 rounded-md shadow-md">
            Esgotado
          </span>
        ) : free_shipping ? (
          <span className="absolute top-3 left-3 z-20 bg-emerald-600 text-white text-xs uppercase font-extrabold tracking-wide px-3 py-1.5 rounded-md shadow-md">
            Frete grátis
          </span>
        ) : null}
        {images && images.length > 0 ? (
          <>
            <img 
              src={images[currentImage]} 
              alt={`${name} - Imagem ${currentImage + 1}`}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${outOfStock ? 'opacity-60' : ''}`} 
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

      <div className="flex justify-between items-start gap-3">
        <div className="flex flex-col min-w-0">
          <h3 className="font-semibold text-base leading-tight text-[var(--color-loja-text)]">{name}</h3>
          <p className="text-sm font-medium text-[var(--color-loja-muted)] mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
          </p>
          {outOfStock ? (
            <p className="text-sm font-bold text-red-600 mt-1">Produto esgotado</p>
          ) : free_shipping ? (
            <p className="text-sm font-bold text-emerald-700 mt-1">Frete grátis neste produto</p>
          ) : null}
        </div>
        <button 
          onClick={handleBuy}
          disabled={outOfStock}
          className="bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] px-4 py-2 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-transform relative z-20 shrink-0 disabled:opacity-40 disabled:active:scale-100"
        >
          {outOfStock ? "Esgotado" : "Comprar"}
        </button>
      </div>
    </div>
  );
}
