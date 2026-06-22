import { FeaturedProductClient } from "./FeaturedProductClient";
import { supabase } from "@/lib/supabase";

export async function FeaturedProduct() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('isFeatured', true)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return <FeaturedProductClient data={data} />;
  } catch (error) {
    console.error("Erro ao carregar produto destaque:", error);
    return null;
  }
}
