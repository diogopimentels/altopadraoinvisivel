"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { X, Minus, Plus, Trash } from "@phosphor-icons/react";
import { CheckoutForm } from "./CheckoutForm";

export function CartDrawer() {
  const { isOpen, toggleCart, items, updateQuantity, removeItem, totalPrice } = useCartStore();
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const panelRef = useRef<HTMLDivElement>(null);
  const total = totalPrice();

  const handleClose = () => {
    toggleCart();
    setTimeout(() => setStep('cart'), 300);
  };

  // Trava scroll + marca o shell da loja como inert (Tab não foca atrás)
  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const shell = document.querySelector<HTMLElement>("[data-loja-shell]");
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflowX = html.style.overflowX;
    const prevBodyOverflowX = body.style.overflowX;
    const prevBodyPadding = body.style.paddingRight;

    const scrollbarGap = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    html.style.overflowX = "hidden";
    body.style.overflow = "hidden";
    body.style.overflowX = "hidden";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    if (shell) {
      shell.setAttribute("inert", "");
      shell.setAttribute("aria-hidden", "true");
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.overflowX = prevHtmlOverflowX;
      body.style.overflow = prevBodyOverflow;
      body.style.overflowX = prevBodyOverflowX;
      body.style.paddingRight = prevBodyPadding;
      if (shell) {
        shell.removeAttribute("inert");
        shell.removeAttribute("aria-hidden");
      }
    };
  }, [isOpen]);

  // Focus trap: Tab cicla só dentro do drawer
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        if (el.getAttribute("tabindex") === "-1") return false;
        const style = window.getComputedStyle(el);
        return style.visibility !== "hidden" && style.display !== "none";
      });

    const first = focusables()[0];
    first?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;

      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === firstEl || !panel.contains(active)) {
          e.preventDefault();
          lastEl.focus({ preventScroll: true });
        }
      } else if (!active || active === lastEl || !panel.contains(active)) {
        e.preventDefault();
        firstEl.focus({ preventScroll: true });
      }
    };

    // Bloqueia scrollIntoView horizontal se o foco vazar
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (target && !panel.contains(target)) {
        e.stopPropagation();
        const list = focusables();
        list[0]?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [isOpen, step]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay — fora da coluna no desktop; no mobile o painel cobre tudo */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleClose}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Painel: full-bleed ≤ max-w-md; centralizado no desktop (sem faixa só à esquerda) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={step === "cart" ? "Carrinho" : "Checkout"}
        className="fixed inset-0 z-50 mx-auto w-full max-w-md bg-[var(--color-loja-bg)] shadow-2xl flex flex-col overflow-hidden overscroll-contain"
      >
        {step === 'cart' ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-bold">Seu Carrinho</h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fechar carrinho"
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4 overscroll-contain">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--color-loja-muted)]">
                  <p>Seu carrinho está vazio.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-lg bg-[var(--color-loja-surface)] min-w-0">
                    <div className="w-20 h-20 bg-gray-200 rounded-md shrink-0 flex items-center justify-center overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500">Sem Foto</span>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 justify-between min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-sm leading-tight truncate">{item.name}</h3>
                        <button type="button" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 shrink-0" aria-label="Remover">
                          <Trash size={18} />
                        </button>
                      </div>

                      <div className="flex justify-between items-end mt-2 gap-2">
                        <p className="font-bold text-sm shrink-0">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                        </p>

                        <div className="flex items-center gap-3 bg-[var(--color-loja-bg)] rounded-full px-2 py-1 border border-gray-200 shrink-0">
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1" aria-label="Diminuir">
                            <Minus size={12} weight="bold" />
                          </button>
                          <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1" aria-label="Aumentar">
                            <Plus size={12} weight="bold" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-[var(--color-loja-bg)] shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[var(--color-loja-muted)]">Total</span>
                  <span className="text-xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] py-4 rounded-full font-bold text-lg active:scale-95 transition-transform"
                >
                  Continuar para Entrega ➔
                </button>
              </div>
            )}
          </>
        ) : (
          <CheckoutForm onBack={() => setStep('cart')} />
        )}
      </div>
    </>
  );
}
