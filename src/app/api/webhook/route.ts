import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Inicializa a Stripe usando a chave secreta que vamos colocar no .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-05-27.dahlia', // Usamos a versão mais recente e estável do SDK instalado
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: Request) {
  try {
    // Para validar a segurança, o Stripe exige o body cru (texto puro) e a assinatura nos headers
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Faltando stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      // Aqui garantimos 100% que a mensagem veio da Stripe e não foi alterada
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`⚠️  Falha ao verificar a assinatura do webhook:`, err.message);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Sucesso! Vamos processar o tipo de evento que chegou
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💰 Pagamento aprovado! Sessão ID:', session.id);
        
        // Recupera o ID do pedido que passamos na criação da sessão
        const orderId = session.client_reference_id;
        
        if (orderId) {
          // Atualiza o pedido no Supabase para 'paid'
          const { error } = await supabaseAdmin
            .from('orders')
            .update({ payment_status: 'paid' })
            .eq('id', orderId);
            
          if (error) {
            console.error("Erro ao atualizar o pedido no Supabase:", error);
          } else {
            console.log(`✅ Pedido ${orderId} atualizado para 'paid' com sucesso.`);
          }
        } else {
          console.error("Sessão finalizada sem client_reference_id:", session.id);
        }
        break;
        
      default:
        // Existem vários eventos, ignoramos os que não queremos tratar ainda
        console.log(`ℹ️ Evento não tratado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro geral no webhook:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
