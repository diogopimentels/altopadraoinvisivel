import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-05-27.dahlia',
});

export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://loja.altopadraoinvisivel.com.br';

    // Cria a sessão real na Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto', 'pix'],
      line_items: items.map((item: any) => ({
        price_data: { 
          currency: 'brl', 
          product_data: { 
            name: item.name,
            images: item.image ? [item.image] : [],
          }, 
          unit_amount: Math.round(item.price * 100), // Stripe exige centavos
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
