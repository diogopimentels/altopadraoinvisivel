"use client";

import { useState } from "react";
import { ProductCard } from "./ProductCard";

interface ProductListProps {
  products: any[];
}

export function ProductList({ products }: ProductListProps) {
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // Extrai as categorias únicas ignorando valores nulos ou vazios
  const categories = [
    "Todos",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];

  // Filtra os produtos com base na categoria selecionada
  const filteredProducts =
    selectedCategory === "Todos"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as string)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 border ${
                selectedCategory === category
                  ? "bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] border-[var(--color-loja-cta)]"
                  : "bg-transparent text-[var(--color-loja-text)] border-gray-300 hover:border-gray-500"
              }`}
            >
              {category as string}
            </button>
          ))}
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-8">
        {filteredProducts.map((product: any) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            price={product.price}
            images={product.images}
          />
        ))}
        {filteredProducts.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            Nenhum produto encontrado nesta categoria.
          </div>
        )}
      </div>
    </div>
  );
}
