import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Placeholder para credenciais da InfinitePay (que o usuário vai enviar)
const INFINITEPAY_API_KEY = process.env.INFINITEPAY_API_KEY;

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

    // 3. Integração com InfinitePay (Pendente credenciais)
    // Como ainda não temos as chaves da API para gerar o link com valor exato,
    // vamos redirecionar temporariamente para a tag pública da InfinitePay.
    
    // O ideal será fazer um POST para https://api.checkout.infinitepay.io/links
    // com o valor total e dados do pedido quando tivermos a API KEY.
    
    const fallbackUrl = `https://infinitepay.io/@altopadraoinvisivel`;

    return NextResponse.json({ url: fallbackUrl, order_id });
  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
