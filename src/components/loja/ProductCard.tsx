"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";
import { externalLinkDestination, type CheckoutMode } from "@/lib/mercadoLivre";
import type { ProductOffer } from "@/lib/crossSell";
import { externalOfferDetails } from "@/lib/externalOffer";

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
  checkout_mode?: CheckoutMode;
  mercado_livre_url?: string | null;
  external_offer_active?: boolean;
  external_offer_original_price?: number | null;
  offers?: ProductOffer[];
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
  checkout_mode,
  mercado_livre_url,
  external_offer_active,
  external_offer_original_price,
  offers = [],
}: ProductCardProps) {
  const { addItem } = useCartStore();
  const [currentImage, setCurrentImage] = useState(0);
  const externalUrl = externalLinkDestination(checkout_mode, mercado_livre_url);
  const externalOffer = externalUrl
    ? externalOfferDetails({ price, external_offer_active, external_offer_original_price })
    : null;
  const productHref = externalUrl || `/produto/${id}`;
  const outOfStock = !externalUrl && Number(stock ?? 0) <= 0;
  const primaryOffer = offers.find((offer) => offer.role === "trigger") || offers[0];
  const offerMessage = primaryOffer?.role === "trigger"
    ? `Compre este e ganhe ${primaryOffer.discountPercent}% em ${primaryOffer.otherProductName}.`
    : primaryOffer
      ? `${primaryOffer.discountPercent}% OFF comprando junto com ${primaryOffer.otherProductName}.`
      : null;

  const handleBuy = () => {
    if (externalUrl) {
      window.location.assign(externalUrl);
      return;
    }
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
      <Link href={productHref} className="absolute inset-0 z-0" aria-label={externalUrl ? `Ver ${name} no link externo` : `Ver detalhes de ${name}`} />
      
      <div className="aspect-square w-full bg-[var(--color-loja-surface)] rounded-md overflow-hidden relative border border-gray-100">
        <Link href={productHref} className="absolute inset-0 z-10" />
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2 pointer-events-none">
          {outOfStock ? (
            <span className="bg-red-600 text-white text-xs uppercase font-extrabold tracking-wide px-3 py-1.5 rounded-md shadow-md">
              Esgotado
            </span>
          ) : (
            <>
              {free_shipping && (
                <span className="bg-emerald-600 text-white text-xs uppercase font-extrabold tracking-wide px-3 py-1.5 rounded-md shadow-md">
                  Frete grátis
                </span>
              )}
              {primaryOffer && (
                <span className="bg-amber-400 text-amber-950 text-xs uppercase font-extrabold tracking-wide px-3 py-1.5 rounded-md shadow-md">
                  Oferta especial
                </span>
              )}
              {externalOffer && (
                <span className="bg-rose-600 text-white text-xs uppercase font-extrabold tracking-wide px-3 py-1.5 rounded-md shadow-md">
                  {externalOffer.discountPercent}% OFF
                </span>
              )}
            </>
          )}
        </div>
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
          <div className="flex flex-wrap items-baseline gap-x-2 mt-1">
            {externalOffer && (
              <span className="text-xs text-gray-400 line-through">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(externalOffer.originalPrice)}
              </span>
            )}
            <span className={`text-sm font-medium ${externalOffer ? "text-rose-700 font-extrabold" : "text-[var(--color-loja-muted)]"}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
            </span>
          </div>
          {outOfStock ? (
            <p className="text-sm font-bold text-red-600 mt-1">Produto esgotado</p>
          ) : externalUrl ? (
            <p className={`text-sm font-bold mt-1 ${externalOffer ? "text-rose-700" : "text-yellow-700"}`}>
              {externalOffer ? "Oferta disponível no site parceiro" : "Disponível via link externo"}
            </p>
          ) : free_shipping ? (
            <p className="text-sm font-bold text-emerald-700 mt-1">Frete grátis neste produto</p>
          ) : null}
          {!outOfStock && offerMessage && (
            <p className="text-xs font-bold leading-snug text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mt-2">
              {offerMessage}
            </p>
          )}
        </div>
        <button 
          onClick={handleBuy}
          disabled={outOfStock}
          className="bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] px-4 py-2 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-transform relative z-20 shrink-0 disabled:opacity-40 disabled:active:scale-100"
        >
          {outOfStock ? "Esgotado" : externalUrl ? "Ver anúncio" : "Comprar"}
        </button>
      </div>
    </div>
  );
}
