import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-05-27.dahlia',
});

export async function POST(request: Request) {
  try {
    const { items, customer, address } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    if (!customer || !address) {
      return NextResponse.json({ error: "Dados de cliente e endereço são obrigatórios" }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://loja.altopadraoinvisivel.com.br';

    // 1. Calcula o total (em BRL real)
    const total_amount = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    const order_id = 'ord_' + Date.now();

    // 2. Salva o pedido como pendente no banco de dados
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: order_id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || null,
        address_cep: address.cep,
        address_street: address.street,
        address_number: address.number,
        address_complement: address.complement || null,
        address_neighborhood: address.neighborhood,
        address_city: address.city,
        address_state: address.state,
        items: items,
        total_amount: total_amount,
        payment_status: 'pending'
      });

    if (dbError) {
      console.error("Erro ao salvar pedido no banco:", dbError);
      return NextResponse.json({ error: "Erro ao registrar pedido." }, { status: 500 });
    }

    // 3. Cria a sessão real na Stripe
    const session = await stripe.checkout.sessions.create({
      client_reference_id: order_id,
      customer_email: customer.email || undefined,
      line_items: items.map((item: any) => ({
        price_data: { 
          currency: 'brl', 
          product_data: { 
            name: item.name,
            images: item.imageUrl ? [item.imageUrl] : [],
          }, 
          unit_amount: Math.round(item.price * 100), // Stripe exige centavos
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${origin}/loja?success=true`,
      cancel_url: `${origin}/loja`,
    });

    // 4. Atualiza o pedido com o session ID (opcional para rastreio)
    await supabaseAdmin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order_id);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
