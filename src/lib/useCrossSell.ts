"use client";

import { useEffect, useMemo, useState } from "react";
import { applyCrossSell, type CrossSellRule, type PricedLine } from "./crossSell";

export function useCrossSell(items: { id: string; price: number }[]) {
  const rules = useCrossSellRules();

  return useMemo(() => applyCrossSell(items, rules), [items, rules]);
}

export function useCrossSellRules() {
  const [rules, setRules] = useState<CrossSellRule[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cross-sell")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.rules)) setRules(data.rules);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return rules;
}

export function lineUnit(priced: Map<string, PricedLine>, item: { id: string; price: number }) {
  return priced.get(item.id)?.unitPrice ?? item.price;
}

export function discountedSubtotal(
  items: { id: string; price: number; quantity: number }[],
  priced: Map<string, PricedLine>
) {
  return items.reduce((sum, item) => sum + lineUnit(priced, item) * item.quantity, 0);
}
