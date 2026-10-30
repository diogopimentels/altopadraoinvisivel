"use client";

import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import type { ProductData } from "@/app/api/products/route";
import { externalOfferDetails } from "@/lib/externalOffer";

type ProductOption = { id: string; name: string; checkout_mode?: string | null };
type ExternalOfferDraft = { active: boolean; originalPrice: string };
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
  const [externalProducts, setExternalProducts] = useState<ProductData[]>([]);
  const [externalDrafts, setExternalDrafts] = useState<Record<string, ExternalOfferDraft>>({});
  const [rules, setRules] = useState<Rule[]>([]);
  const [triggerProductId, setTriggerProductId] = useState("");
  const [targetProductId, setTargetProductId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [externalSavingId, setExternalSavingId] = useState("");
  const [externalError, setExternalError] = useState("");
  const [externalSavedId, setExternalSavedId] = useState("");

  const load = async () => {
    const [productRes, ruleRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/cross-sell?all=1"),
    ]);
    const productData = await productRes.json();
    const ruleData = await ruleRes.json();
    if (Array.isArray(productData)) {
      const allProducts = productData as ProductData[];
      setProducts(allProducts.filter((product: ProductOption) =>
        !product.checkout_mode || product.checkout_mode === "store"
      ));
      const external = allProducts.filter((product) =>
        product.checkout_mode === "external_link" || product.checkout_mode === "mercado_livre"
      );
      setExternalProducts(external);
      setExternalDrafts(Object.fromEntries(external.map((product) => [
        product.id,
        {
          active: Boolean(product.external_offer_active),
          originalPrice: product.external_offer_original_price?.toString() || "",
        },
      ])));
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

  const updateExternalDraft = (productId: string, patch: Partial<ExternalOfferDraft>) => {
    setExternalDrafts((current) => ({
      ...current,
      [productId]: {
        active: current[productId]?.active ?? false,
        originalPrice: current[productId]?.originalPrice ?? "",
        ...patch,
      },
    }));
    setExternalSavedId("");
    setExternalError("");
  };

  const saveExternalOffer = async (product: ProductData) => {
    const draft = externalDrafts[product.id] || { active: false, originalPrice: "" };
    const originalPrice = Number(draft.originalPrice);
    if (draft.active && (!Number.isFinite(originalPrice) || originalPrice <= product.price)) {
      setExternalError(`Em "${product.name}", o preço anterior precisa ser maior que o preço atual.`);
      return;
    }

    setExternalSavingId(product.id);
    setExternalSavedId("");
    setExternalError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...product,
          checkout_mode: "external_link",
          external_offer_active: draft.active,
          external_offer_original_price: draft.active ? originalPrice : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar a promoção externa.");
      setExternalSavedId(product.id);
      await load();
    } catch (err) {
      setExternalError(err instanceof Error ? err.message : "Erro ao salvar a promoção externa.");
    } finally {
      setExternalSavingId("");
    }
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

      <section className="mt-4 pt-6 border-t-2 border-gray-200 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold">Promoção de link externo</h2>
          <p className="text-xs text-gray-500 mt-1">
            Use nos produtos do Mercado Livre, Shopee ou outro site. A etiqueta aparece na vitrine, mas não altera o preço nem cria desconto no carrinho da loja.
          </p>
        </div>

        {externalProducts.length === 0 ? (
          <p className="text-sm text-gray-500 font-semibold">Nenhum produto com link externo cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {externalProducts.map((product) => {
              const draft = externalDrafts[product.id] || { active: false, originalPrice: "" };
              const preview = externalOfferDetails({
                price: product.price,
                external_offer_active: draft.active,
                external_offer_original_price: Number(draft.originalPrice),
              });
              return (
                <div key={product.id} className="border border-gray-200 rounded-xl bg-white p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold leading-tight">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Preço atual: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateExternalDraft(product.id, { active: !draft.active })}
                      className={`shrink-0 text-xs font-extrabold px-3 py-2 rounded-full border transition-colors ${
                        draft.active
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-white text-gray-600 border-gray-300"
                      }`}
                      aria-pressed={draft.active}
                    >
                      {draft.active ? "Etiqueta ativa" : "Ativar etiqueta"}
                    </button>
                  </div>

                  {draft.active && (
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <label className="flex-1 text-xs font-bold text-gray-600">
                        Preço anterior (riscado)
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={draft.originalPrice}
                          onChange={(event) => updateExternalDraft(product.id, { originalPrice: event.target.value })}
                          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold"
                          placeholder="Ex: 29.90"
                        />
                      </label>
                      <div className="sm:w-36 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-center">
                        <span className="block text-[10px] uppercase font-bold text-rose-700">Etiqueta</span>
                        <span className="text-sm font-extrabold text-rose-700">
                          {preview ? `${preview.discountPercent}% OFF` : "Informe o preço"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => saveExternalOffer(product)}
                      disabled={externalSavingId === product.id}
                      className="bg-black text-white text-xs font-bold px-4 py-2.5 rounded-lg disabled:opacity-50"
                    >
                      {externalSavingId === product.id ? "Salvando..." : "Salvar etiqueta"}
                    </button>
                    {externalSavedId === product.id && (
                      <span className="text-xs font-bold text-emerald-700">Salvo com sucesso.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {externalError && <p className="text-sm font-semibold text-red-600">{externalError}</p>}
      </section>
    </div>
  );
}
