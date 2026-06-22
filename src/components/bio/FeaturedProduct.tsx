import { FeaturedProductClient } from "./FeaturedProductClient";

// Forçamos a buscar no tempo de requisição para fins deste MVP 
// usando fetch nativo com cache="no-store".
// Numa aplicação real poderíamos usar ISR e um Webhook do Admin.

export async function FeaturedProduct() {
  try {
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : `${protocol}://localhost:3000`;
      
    const res = await fetch(`${baseUrl}/api/products`, { cache: 'no-store' });
    const products = await res.json();

    // Filtra qual é o destaque
    const data = Array.isArray(products) ? products.find((p: any) => p.isFeatured) : null;

    if (!data) {
      return null;
    }

    return <FeaturedProductClient data={data} />;
  } catch (error) {
    console.error("Erro ao carregar produto destaque:", error);
    return null;
  }
}
