export type ExternalOfferInput = {
  price?: number | null;
  external_offer_active?: boolean | null;
  external_offer_original_price?: number | null;
};

export type ExternalOffer = {
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
};

export function externalOfferDetails(product: ExternalOfferInput): ExternalOffer | null {
  if (!product.external_offer_active) return null;

  const currentPrice = Number(product.price);
  const originalPrice = Number(product.external_offer_original_price);
  if (!Number.isFinite(currentPrice) || !Number.isFinite(originalPrice)) return null;
  if (currentPrice < 0 || originalPrice <= currentPrice) return null;

  return {
    currentPrice,
    originalPrice,
    discountPercent: Math.max(1, Math.round((1 - currentPrice / originalPrice) * 100)),
  };
}
