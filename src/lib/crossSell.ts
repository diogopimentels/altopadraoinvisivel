export type CrossSellRule = {
  id: string;
  triggerProductId: string;
  targetProductId: string;
  discountPercent: number;
  triggerName?: string;
  targetName?: string;
  triggerProduct?: CrossSellProduct | null;
  targetProduct?: CrossSellProduct | null;
  compatible?: boolean;
  compatibilityError?: string | null;
};

export type CrossSellProduct = {
  id: string;
  name: string;
  price: number;
  images: string[];
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  stock: number;
  isPublished: boolean;
  checkoutMode: string;
};

export type ProductOffer = {
  ruleId: string;
  role: "trigger" | "target";
  discountPercent: number;
  otherProductName: string;
};

export type CrossSellSuggestion = {
  ruleId: string;
  product: CrossSellProduct;
  discountPercent: number;
  kind: "discounted_target" | "required_trigger";
  affectedProductName: string;
};

export type PricedLine = {
  id: string;
  unitPrice: number;
  originalPrice: number;
  discountPercent: number;
  triggerName: string | null;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function productOffers(productId: string, rules: CrossSellRule[]): ProductOffer[] {
  return rules.flatMap<ProductOffer>((rule) => {
    if (rule.triggerProductId === productId) {
      return [{
        ruleId: rule.id,
        role: "trigger" as const,
        discountPercent: rule.discountPercent,
        otherProductName: rule.targetName || rule.targetProduct?.name || "outro produto",
      }];
    }
    if (rule.targetProductId === productId) {
      return [{
        ruleId: rule.id,
        role: "target" as const,
        discountPercent: rule.discountPercent,
        otherProductName: rule.triggerName || rule.triggerProduct?.name || "outro produto",
      }];
    }
    return [];
  });
}

export function cartSuggestions(
  itemIds: string[],
  rules: CrossSellRule[]
): CrossSellSuggestion[] {
  const present = new Set(itemIds);
  const suggestions = new Map<string, CrossSellSuggestion>();

  for (const rule of rules) {
    if (rule.compatible === false) continue;

    let suggestion: CrossSellSuggestion | null = null;
    if (present.has(rule.triggerProductId) && !present.has(rule.targetProductId) && rule.targetProduct) {
      suggestion = {
        ruleId: rule.id,
        product: rule.targetProduct,
        discountPercent: rule.discountPercent,
        kind: "discounted_target",
        affectedProductName: rule.targetProduct.name,
      };
    } else if (present.has(rule.targetProductId) && !present.has(rule.triggerProductId) && rule.triggerProduct) {
      suggestion = {
        ruleId: rule.id,
        product: rule.triggerProduct,
        discountPercent: rule.discountPercent,
        kind: "required_trigger",
        affectedProductName: rule.targetName || rule.targetProduct?.name || "o produto da oferta",
      };
    }

    if (!suggestion || suggestion.product.stock <= 0) continue;
    const current = suggestions.get(suggestion.product.id);
    if (!current || suggestion.discountPercent > current.discountPercent) {
      suggestions.set(suggestion.product.id, suggestion);
    }
  }

  return [...suggestions.values()]
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 2);
}

/** Se o carrinho tem o gatilho, o alvo sai com o maior desconto que se aplicar. Não acumula. */
export function applyCrossSell(
  items: { id: string; price: number }[],
  rules: CrossSellRule[]
): Map<string, PricedLine> {
  const present = new Set(items.map((item) => item.id));
  const best = new Map<string, { percent: number; triggerName: string | null }>();

  for (const rule of rules) {
    if (rule.triggerProductId === rule.targetProductId) continue;
    if (!present.has(rule.triggerProductId) || !present.has(rule.targetProductId)) continue;
    const percent = Math.min(99, Math.max(0, Math.round(rule.discountPercent)));
    if (percent <= 0) continue;
    const current = best.get(rule.targetProductId);
    if (!current || percent > current.percent) {
      best.set(rule.targetProductId, {
        percent,
        triggerName: rule.triggerName || null,
      });
    }
  }

  const priced = new Map<string, PricedLine>();
  for (const item of items) {
    const offer = best.get(item.id);
    const originalPrice = roundMoney(item.price);
    const discountPercent = offer?.percent || 0;
    const discounted = roundMoney(originalPrice * (1 - discountPercent / 100));
    priced.set(item.id, {
      id: item.id,
      originalPrice,
      discountPercent,
      triggerName: offer?.triggerName || null,
      unitPrice: discountPercent > 0 ? Math.max(0.01, discounted) : originalPrice,
    });
  }
  return priced;
}
