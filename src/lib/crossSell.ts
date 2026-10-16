export type CrossSellRule = {
  id: string;
  triggerProductId: string;
  targetProductId: string;
  discountPercent: number;
  triggerName?: string;
  targetName?: string;
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
