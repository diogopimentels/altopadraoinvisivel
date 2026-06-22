import { ProductCard } from "@/components/loja/ProductCard";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export default async function LojaPage() {
  let products: any[] = [];
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      products = data;
    }
  } catch (error) {
    console.error("Erro ao ler produtos do Supabase:", error);
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Banner / Header */}
      <div className="bg-[var(--color-loja-surface)] p-6 rounded-lg text-center border border-gray-100">
        <h1 className="text-2xl font-extrabold mb-2 text-[var(--color-loja-text)]">Nova Coleção</h1>
        <p className="text-[var(--color-loja-muted)] text-sm mb-1">Disponível por tempo limitado.</p>
        <span className="inline-block bg-[var(--color-loja-cta)]/10 text-[var(--color-loja-cta)] text-xs font-bold px-2 py-1 rounded-md">
          {products.length} {products.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
        </span>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-8">
        {products.map((product: any) => (
          <ProductCard 
            key={product.id}
            id={product.id}
            name={product.name} 
            price={product.price} 
            images={product.images}
          />
        ))}
        {products.length === 0 && (
          <div className="text-center py-10 text-gray-500">Nenhum produto disponível no momento.</div>
        )}
      </div>
    </div>
  );
}
