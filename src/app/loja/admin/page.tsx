"use client";

import { useEffect, useState } from "react";
import { ProductData } from "@/app/api/products/route";
import { ProductForm } from "@/components/admin/ProductForm";
import { OrdersList } from "@/components/admin/OrdersList";
import { Plus, Star, PencilSimple, Trash, Storefront, ShoppingBag } from "@phosphor-icons/react";
import { logoutAction } from "./actions";

export default function AdminPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const currentFeatured = products.find(p => p.isFeatured);

  const handleSaveProduct = async (product: ProductData) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Erro da API:", errorData);
        alert(`Erro ao salvar: ${errorData.error || 'Verifique os dados enviados.'}`);
        return; // Não fecha o formulário em caso de erro
      }

      setEditingProduct(null);
      setIsAddingNew(false);
      await fetchProducts(); // recarrega a lista
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    
    await fetch(`/api/products?id=${id}`, {
      method: "DELETE",
    });
    await fetchProducts();
  };

  if (loading && products.length === 0) return <div className="p-8 text-center font-bold">Carregando painel...</div>;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-10">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-loja-text)]">Gerenciador de Loja</h1>
          <p className="text-[var(--color-loja-muted)] text-sm mt-1">
            {products.length} {products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://loja.altopadraoinvisivel.com.br" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-bold text-[var(--color-loja-cta)] hover:underline"
          >
            Ver Loja ↗
          </a>
          <form action={logoutAction}>
            <button type="submit" className="text-sm font-semibold text-red-500 hover:text-red-700 underline">
              Sair
            </button>
          </form>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-gray-200 pb-1 mb-2">
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'products' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Storefront size={18} weight={activeTab === 'products' ? 'fill' : 'regular'} /> Produtos
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <ShoppingBag size={18} weight={activeTab === 'orders' ? 'fill' : 'regular'} /> Pedidos
        </button>
      </div>

      {activeTab === 'orders' ? (
        <OrdersList />
      ) : (
        <div className="w-full">
          {isAddingNew || editingProduct ? (
            <ProductForm 
              initialData={editingProduct} 
          currentFeaturedName={currentFeatured?.name}
          onSave={handleSaveProduct}
          onCancel={() => {
            setEditingProduct(null);
            setIsAddingNew(false);
          }}
        />
      ) : (
        <>
          <button 
            onClick={() => setIsAddingNew(true)}
            className="flex items-center justify-center w-fit px-6 gap-2 bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] py-3 rounded-xl text-sm font-bold shadow-md hover:scale-[1.01] transition-transform"
          >
            <Plus size={18} weight="bold" /> Novo Produto
          </button>

          <div className="flex flex-col gap-4 mt-2">
            {products.map((product) => (
              <div key={product.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg bg-[var(--color-loja-surface)] items-center">
                
                {/* Thumbnail da primeira imagem */}
                <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden shrink-0 relative">
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-500 text-center">Sem Foto</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold leading-tight">{product.name}</h3>
                    {product.isFeatured && (
                      <span className="bg-yellow-100 text-yellow-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                        <Star weight="fill" size={10} /> Destaque
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium mt-1 text-[var(--color-loja-muted)]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingProduct(product)}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                    aria-label="Editar"
                  >
                    <PencilSimple size={20} weight="fill" />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-3 bg-red-50 hover:bg-red-100 rounded-full text-red-600 transition-colors"
                    aria-label="Excluir"
                  >
                    <Trash size={20} weight="fill" />
                  </button>
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                Nenhum produto cadastrado ainda.
              </div>
            )}
          </div>
        </>
      )}
        </div>
      )}
    </div>
  );
}
