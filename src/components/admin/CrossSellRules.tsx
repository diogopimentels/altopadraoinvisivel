"use client";

import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";

type ProductOption = { id: string; name: string; checkout_mode?: string | null };
type Rule = {
  id: string;
  triggerProductId: string;
  targetProductId: string;
  discountPercent: number;
  triggerName: string;
  targetName: string;
  compatible?: boolean;
  compatibilityError?: string | null;
};

export function CrossSellRules() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [triggerProductId, setTriggerProductId] = useState("");
  const [targetProductId, setTargetProductId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [productRes, ruleRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/cross-sell?all=1"),
    ]);
    const productData = await productRes.json();
    const ruleData = await ruleRes.json();
    if (Array.isArray(productData)) {
      setProducts(productData.filter((product: ProductOption) =>
        !product.checkout_mode || product.checkout_mode === "store"
      ));
    }
    setRules(Array.isArray(ruleData.rules) ? ruleData.rules : []);
  };

  useEffect(() => {
    load().catch(() => setError("Não foi possível carregar as ofertas."));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/cross-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerProductId, targetProductId, discountPercent: Number(discountPercent) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      setTriggerProductId("");
      setTargetProductId("");
      setDiscountPercent(10);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/cross-sell?id=${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold">Oferta cruzada</h2>
        <p className="text-xs text-gray-500 mt-1">
          Escolha o produto que libera a oferta e, depois, o produto que realmente recebe o desconto. O primeiro continua no preço cheio.
        </p>
        <p className="text-xs font-semibold text-amber-700 mt-2">
          Produtos com link externo não aparecem nas opções, pois não passam pelo carrinho da loja.
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white p-4 flex flex-col gap-3">
        <label className="text-xs font-bold text-gray-600">
          1. Produto que libera a oferta (sem desconto)
          <select
            value={triggerProductId}
            onChange={(event) => setTriggerProductId(event.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold"
          >
            <option value="">Escolha o produto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id} disabled={product.id === targetProductId}>{product.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-gray-600">
          2. Produto que recebe o desconto
          <select
            value={targetProductId}
            onChange={(event) => setTargetProductId(event.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold"
          >
            <option value="">Escolha o produto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id} disabled={product.id === triggerProductId}>{product.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-gray-600">
          3. Desconto aplicado somente no segundo produto
          <input
            type="number"
            min={1}
            max={99}
            value={discountPercent}
            onChange={(event) => setDiscountPercent(Number(event.target.value))}
            className="mt-1 w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold"
          />
        </label>
        <button
          type="button"
          disabled={saving || !triggerProductId || !targetProductId}
          onClick={save}
          className="bg-black text-white text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar oferta"}
        </button>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-gray-500 font-semibold">Nenhuma oferta cadastrada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <div key={rule.id} className="border border-gray-200 rounded-xl bg-white px-3 py-3 flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm">
                  <span className="font-bold">{rule.triggerName}</span>
                  <span className="text-gray-500"> libera </span>
                  <span className="font-bold">{rule.discountPercent}%</span>
                  <span className="text-gray-500"> em </span>
                  <span className="font-bold">{rule.targetName}</span>
                </p>
                {rule.compatible === false && (
                  <p className="text-xs font-bold text-red-600">
                    Incompatível: {rule.compatibilityError}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => remove(rule.id)} className="text-red-600 shrink-0" aria-label="Apagar oferta">
                <Trash size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
