"use client";

import { useCartStore } from "@/store/useCartStore";

export function StoreHeader() {
  const { totalItems, toggleCart } = useCartStore();
  const count = totalItems();

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-loja-bg)]/80 backdrop-blur-md border-b border-gray-100 px-4 py-4">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <span className="font-bold text-lg tracking-tight">Alto Padrão Store</span>
        <button 
          onClick={toggleCart}
          className="relative w-10 h-10 rounded-full bg-[var(--color-loja-surface)] flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          {/* Ícone de Sacola (bag) simples via SVG se não quisermos usar phosphor aqui, mas podemos usar phosphor */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
            <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path>
          </svg>

          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
