import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ProductClient } from "./ProductClient";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-loja-muted)] hover:text-[var(--color-loja-text)] transition-colors w-fit">
        <ArrowLeft size={16} weight="bold" /> Voltar para a loja
      </Link>
      
      <ProductClient product={product} />
    </div>
  );
}
