import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getTrustedAppOrigin } from '@/lib/auth';
import { quoteShipping } from '@/lib/shippingQuote';

export async function POST(request: Request) {
  try {
    const { items, customer, address, shippingOption } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
    }

    if (!customer?.name || !customer?.phone || !address?.cep) {
      return NextResponse.json(
        { error: 'Dados de cliente e endereço são obrigatórios' },
        { status: 400 }
      );
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    const origin = getTrustedAppOrigin();
    const isHttps = origin.startsWith('https://');
    const admin = getSupabaseAdmin();

    // 1) Preços e produtos só do banco (nunca confiar no client)
    const productIds = [...new Set((items as any[]).map((i) => String(i.id)))];
    const { data: productsDb, error: productsError } = await admin
      .from('products')
      .select('id, name, price, weight, width, height, length, supplier_id, is_published, images')
      .in('id', productIds);

    if (productsError) throw productsError;

    const productMap = new Map((productsDb || []).map((p) => [p.id, p]));
    const trustedItems: {
      id: string;
      name: string;
      price: number;
      quantity: number;
      supplier_id: string | null;
      weight: number;
      width: number;
      height: number;
      length: number;
      imageUrl?: string;
    }[] = [];

    for (const raw of items as any[]) {
      const product = productMap.get(String(raw.id));
      if (!product || !product.is_published) {
        return NextResponse.json(
          { error: `Produto indisponível: ${raw.id}` },
          { status: 400 }
        );
      }

      const quantity = Math.max(1, Math.min(99, Math.floor(Number(raw.quantity) || 1)));
      trustedItems.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity,
        supplier_id: product.supplier_id,
        weight: Number(product.weight ?? 0.5),
        width: Number(product.width ?? 20),
        height: Number(product.height ?? 15),
        length: Number(product.length ?? 20),
        imageUrl: Array.isArray(product.images) ? product.images[0] : undefined,
      });
    }

    const items_total = trustedItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    // 2) Frete recalculado no servidor; client só escolhe o service id (PAC/SEDEX)
    const destinationCep = String(address.cep).replace(/\D/g, '');
    const quote = await quoteShipping(
      destinationCep,
      trustedItems.map((i) => ({ id: i.id, quantity: i.quantity }))
    );

    if (!quote.ok || quote.options.length === 0) {
      return NextResponse.json(
        { error: quote.ok === false ? quote.error : 'Frete indisponível' },
        { status: 400 }
      );
    }

    const selectedServiceId = String(shippingOption?.id || quote.options[0].id);
    const trustedShipping = quote.options.find((o) => o.id === selectedServiceId) || quote.options[0];
    const shipping_cost = trustedShipping.price;
    const total_amount = Number((items_total + shipping_cost).toFixed(2));
    const order_id = 'ord_' + Date.now();

    const orderPayload = {
      id: order_id,
      customer_name: String(customer.name).trim(),
      customer_phone: String(customer.phone).trim(),
      customer_email: customer.email || null,
      address_cep: destinationCep,
      address_street: String(address.street || '').trim(),
      address_number: String(address.number || '').trim(),
      address_complement: address.complement || null,
      address_neighborhood: String(address.neighborhood || '').trim(),
      address_city: String(address.city || '').trim(),
      address_state: String(address.state || '').trim(),
      items: trustedItems,
      total_amount,
      shipping_cost,
      shipping_breakdown: trustedShipping.breakdown,
      payment_status: 'pending',
    };

    const { error: dbError } = await admin.from('orders').insert(orderPayload);

    if (dbError) {
      console.error('Erro ao salvar pedido no banco:', dbError);
      if (String(dbError.message || '').includes('shipping_breakdown')) {
        const { shipping_breakdown: _sb, ...withoutBreakdown } = orderPayload as any;
        const { error: fallbackError } = await admin.from('orders').insert(withoutBreakdown);
        if (fallbackError) {
          return NextResponse.json({ error: 'Erro ao registrar pedido.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Erro ao registrar pedido.' }, { status: 500 });
      }
    }

    const preferenceItems = [
      ...trustedItems.map((item) => ({
        id: item.id,
        title: item.name.slice(0, 256),
        quantity: item.quantity,
        unit_price: Number(item.price.toFixed(2)),
        currency_id: 'BRL',
      })),
      {
        id: 'shipping',
        title: `Frete: ${trustedShipping.name}`.slice(0, 256),
        quantity: 1,
        unit_price: Number(shipping_cost.toFixed(2)),
        currency_id: 'BRL',
      },
    ];

    const preference: Record<string, unknown> = {
      items: preferenceItems,
      payer: {
        name: String(customer.name).trim(),
        email: customer.email || undefined,
        phone: customer.phone
          ? { number: String(customer.phone).replace(/\D/g, '') }
          : undefined,
        address: {
          zip_code: destinationCep,
          street_name: String(address.street || ''),
          street_number: Number(address.number) || undefined,
        },
      },
      external_reference: order_id,
      metadata: {
        order_id,
        expected_amount: total_amount,
        shipping_service_id: trustedShipping.id,
      },
      statement_descriptor: 'ALTO PADRAO',
      back_urls: {
        success: `${origin}/loja?success=true`,
        failure: `${origin}/loja?failure=true`,
        pending: `${origin}/loja?pending=true`,
      },
    };

    if (isHttps) {
      preference.auto_return = 'approved';
      preference.notification_url = `${origin}/api/webhooks/mercadopago`;
    }

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await res.json();

    if (!res.ok || (!mpData.init_point && !mpData.sandbox_init_point)) {
      console.error('Mercado Pago Preference Error:', mpData);
      return NextResponse.json({ error: 'Erro ao gerar link de pagamento.' }, { status: 500 });
    }

    const useSandbox = process.env.MERCADOPAGO_ENVIRONMENT === 'sandbox';
    const checkoutUrl = useSandbox
      ? mpData.sandbox_init_point || mpData.init_point
      : mpData.init_point || mpData.sandbox_init_point;

    return NextResponse.json({ url: checkoutUrl, order_id, preference_id: mpData.id });
  } catch (error: any) {
    console.error('Erro no checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
