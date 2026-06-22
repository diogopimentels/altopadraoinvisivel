"use client";

import { useCartStore } from "@/store/useCartStore";
import { X, Minus, Plus, Trash } from "@phosphor-icons/react";

export function CartDrawer() {
  const { isOpen, toggleCart, items, updateQuantity, removeItem, totalPrice } = useCartStore();

  if (!isOpen) return null;

  const handleCheckout = async () => {
    // Aqui nós vamos chamar a rota de checkout do Stripe que criaremos a seguir
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Erro ao redirecionar para o Stripe", error);
      alert("Erro ao processar checkout. Tente novamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay Escuro */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
        onClick={toggleCart}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[var(--color-loja-bg)] h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">Seu Carrinho</h2>
          <button 
            onClick={toggleCart}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--color-loja-muted)]">
              <p>Seu carrinho está vazio.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-lg bg-[var(--color-loja-surface)]">
                {/* Fallback de Imagem */}
                <div className="w-20 h-20 bg-gray-200 rounded-md shrink-0 flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-500">Sem Foto</span>
                  )}
                </div>
                
                {/* Detalhes do Produto */}
                <div className="flex flex-col flex-1 justify-between">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700">
                      <Trash size={18} />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <p className="font-bold text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                    </p>
                    
                    {/* Controles de Quantidade */}
                    <div className="flex items-center gap-3 bg-[var(--color-loja-bg)] rounded-full px-2 py-1 border border-gray-200">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1">
                        <Minus size={12} weight="bold" />
                      </button>
                      <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1">
                        <Plus size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (Total e Checkout) */}
        {items.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-[var(--color-loja-bg)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[var(--color-loja-muted)]">Total</span>
              <span className="text-xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice())}
              </span>
            </div>
            <button 
              onClick={handleCheckout}
              className="w-full bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] py-4 rounded-full font-bold text-lg active:scale-95 transition-transform"
            >
              Finalizar Compra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
