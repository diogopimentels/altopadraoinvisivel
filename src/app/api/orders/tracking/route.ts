import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidEmail, sendTrackingEmail } from '@/lib/orderEmails';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  id: z.string().min(1),
  trackingCode: z.string().trim().min(5).max(40),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Informe o pedido e um código de rastreio.' }, { status: 400 });
  }

  const trackingCode = parsed.data.trackingCode.toUpperCase();
  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from('orders')
    .select('id, customer_name, customer_email, payment_status')
    .eq('id', parsed.data.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }
  if (order.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Só pedido pago recebe rastreio.' }, { status: 400 });
  }

  const email = String(order.customer_email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Esse pedido não tem e-mail.' }, { status: 400 });
  }

  const { error: saveError } = await admin
    .from('orders')
    .update({ tracking_code: trackingCode })
    .eq('id', order.id);

  if (saveError) {
    const missing = String(saveError.message || '').includes('tracking_code');
    return NextResponse.json(
      { error: missing ? 'Falta criar as colunas de rastreio no Supabase.' : 'Erro ao salvar o código.' },
      { status: 500 }
    );
  }

  try {
    await sendTrackingEmail({ ...order, customer_email: email, tracking_code: trackingCode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao enviar e-mail';
    console.error('Rastreio:', message);
    return NextResponse.json(
      { error: `Código salvo, mas o e-mail não saiu: ${message}` },
      { status: 502 }
    );
  }

  const sentAt = new Date().toISOString();
  await admin.from('orders').update({ tracking_sent_at: sentAt }).eq('id', order.id);

  return NextResponse.json({ success: true, trackingCode, trackingSentAt: sentAt });
}
