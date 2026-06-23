import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // {
    //   "invoice_slug": "abc123",
    //   "amount": 1000,
    //   "paid_amount": 1010,
    //   "installments": 1,
    //   "capture_method": "credit_card",
    //   "transaction_nsu": "UUID",
    //   "order_nsu": "UUID-do-pedido",
    //   "receipt_url": "https://comprovante.com/123",
    //   "items": [...]
    // }

    const orderId = data.order_nsu;

    if (!orderId) {
      return NextResponse.json({ error: "order_nsu não encontrado" }, { status: 400 });
    }

    // Atualiza o pedido no banco de dados para "pago"
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        infinitepay_id: data.invoice_slug, // opcional, caso adicione essa coluna no futuro
      })
      .eq('id', orderId);

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      // Se a coluna infinitepay_id não existir, tenta atualizar sem ela
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid'
        })
        .eq('id', orderId);
    }

    // Responde rapidamente com 200 OK para a InfinitePay
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook InfinitePay Error:", error);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
