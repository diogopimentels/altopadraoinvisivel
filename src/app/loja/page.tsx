import { ProductList } from "@/components/loja/ProductList";
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
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-[var(--color-loja-surface)] rounded-2xl border border-gray-100 shadow-sm px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
            <span className="text-2xl">⏳</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--color-loja-text)]">Em Breve</h1>
          <p className="text-[var(--color-loja-muted)] text-lg max-w-sm">
            Nossa coleção exclusiva de Alto Padrão está sendo preparada. Volte em breve para novidades!
          </p>
        </div>
      ) : (
        <>
          {/* Banner / Header */}
          <div className="bg-[var(--color-loja-surface)] p-6 rounded-lg text-center border border-gray-100">
            <h1 className="text-2xl font-extrabold mb-2 text-[var(--color-loja-text)]">Produtos Disponíveis</h1>
            <p className="text-[var(--color-loja-muted)] text-sm mb-1">Curadoria dos melhores produtos.</p>
            <span className="inline-block bg-[var(--color-loja-cta)]/10 text-[var(--color-loja-cta)] text-xs font-bold px-2 py-1 rounded-md">
              {products.length} {products.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
            </span>
          </div>

          {/* Product Grid via Client Component para Filtros */}
          <ProductList products={products} />
        </>
      )}
    </div>
  );
}
