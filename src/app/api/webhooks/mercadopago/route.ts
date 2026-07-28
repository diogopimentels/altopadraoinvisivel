import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function verifyWebhookSignature(request: Request, url: URL): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    // Fail-closed em produção; em dev local sem secret, só loga
    if (process.env.NODE_ENV === 'production' || process.env.MERCADOPAGO_ENVIRONMENT === 'production') {
      console.error('MERCADOPAGO_WEBHOOK_SECRET ausente — rejeitando webhook');
      return false;
    }
    console.warn('MERCADOPAGO_WEBHOOK_SECRET ausente — assinatura não validada (dev only)');
    return true;
  }

  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');
  if (!xSignature) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(',')) {
    const [key, ...rest] = part.split('=');
    if (key && rest.length) parts[key.trim()] = rest.join('=').trim();
  }

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  let dataId = url.searchParams.get('data.id') || '';
  if (dataId && /[a-zA-Z]/.test(dataId)) {
    dataId = dataId.toLowerCase();
  }

  let manifest = '';
  if (dataId) manifest += `id:${dataId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(v1, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function fetchPayment(paymentId: string) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao buscar pagamento ${paymentId}: ${res.status} ${body}`);
  }

  return res.json();
}

async function markOrderPaid(orderId: string, paymentId: string | number) {
  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      mercadopago_payment_id: String(paymentId),
    })
    .eq('id', orderId)
    .eq('payment_status', 'pending');

  if (error) {
    console.warn('Update com mercadopago_payment_id falhou, tentando só status:', error.message);
    const { error: fallbackError } = await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId)
      .eq('payment_status', 'pending');

    if (fallbackError) throw fallbackError;
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);

    if (!verifyWebhookSignature(request, url)) {
      console.error('Webhook MP: assinatura inválida');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const type = body.type || body.action || url.searchParams.get('type') || url.searchParams.get('topic');
    const paymentId =
      body?.data?.id ||
      url.searchParams.get('data.id') ||
      body?.id ||
      url.searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (type && !String(type).toLowerCase().includes('payment')) {
      return NextResponse.json({ ok: true, ignored: type }, { status: 200 });
    }

    const payment = await fetchPayment(String(paymentId));

    if (payment.status === 'approved') {
      const orderId = payment.external_reference || payment.metadata?.order_id;
      if (!orderId) {
        console.error('Pagamento aprovado sem external_reference:', paymentId);
        return NextResponse.json({ error: 'external_reference ausente' }, { status: 400 });
      }

      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('id, total_amount, payment_status')
        .eq('id', String(orderId))
        .maybeSingle();

      if (orderError || !order) {
        console.error('Pedido não encontrado para webhook:', orderId, orderError);
        return NextResponse.json({ error: 'order not found' }, { status: 404 });
      }

      if (order.payment_status === 'paid') {
        return NextResponse.json({ success: true, already_paid: true }, { status: 200 });
      }

      const paidAmount = Number(payment.transaction_amount);
      const expected = Number(order.total_amount);
      // Tolerância de 0.05 por arredondamento
      if (Number.isFinite(paidAmount) && Number.isFinite(expected) && Math.abs(paidAmount - expected) > 0.05) {
        console.error('Valor pago diverge do pedido', {
          orderId,
          paidAmount,
          expected,
          paymentId: payment.id,
        });
        return NextResponse.json({ error: 'amount mismatch' }, { status: 409 });
      }

      await markOrderPaid(String(orderId), payment.id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Mercado Pago Error:', error);
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
