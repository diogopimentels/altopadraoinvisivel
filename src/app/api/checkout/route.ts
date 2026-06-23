import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { items, customer, address, shippingOption } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    if (!customer || !address) {
      return NextResponse.json({ error: "Dados de cliente e endereço são obrigatórios" }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://loja.altopadraoinvisivel.com.br';

    // 1. Calcula o total (em BRL real)
    const items_total = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    const shipping_cost = shippingOption ? shippingOption.price : 0;
    const total_amount = items_total + shipping_cost;
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
        shipping_cost: shipping_cost,
        payment_status: 'pending'
      });

    if (dbError) {
      console.error("Erro ao salvar pedido no banco:", dbError);
      return NextResponse.json({ error: "Erro ao registrar pedido." }, { status: 500 });
    }

    // 3. Integração com a API da InfinitePay
    const infinitePayPayload = {
      handle: "altopadraoinvisivel",
      order_nsu: order_id,
      redirect_url: `${origin}/loja?success=true`,
      customer: {
        name: customer.name,
        email: customer.email || "contato@altopadraoinvisivel.com.br",
        phone_number: customer.phone.replace(/\D/g, '') // Apenas números
      },
      address: {
        cep: address.cep.replace(/\D/g, ''),
        street: address.street,
        neighborhood: address.neighborhood,
        number: address.number,
        complement: address.complement || ""
      },
      items: [
        ...items.map((item: any) => ({
          quantity: item.quantity,
          price: Math.round(item.price * 100), // Em centavos
          description: item.name
        })),
        ...(shippingOption ? [{
          quantity: 1,
          price: Math.round(shippingOption.price * 100),
          description: `Frete: ${shippingOption.name}`
        }] : [])
      ]
    };

    const res = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(infinitePayPayload)
    });

    const infiniteData = await res.json();

    if (!infiniteData.url) {
      console.error("InfinitePay Link Creation Error:", infiniteData);
      return NextResponse.json({ error: "Erro ao gerar link de pagamento." }, { status: 500 });
    }

    return NextResponse.json({ url: infiniteData.url, order_id });
  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
