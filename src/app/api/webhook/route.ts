import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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
        
        // TODO: Aqui é onde você vai adicionar a lógica para alterar o status 
        // do seu pedido no banco de dados para "PAGO".
        // ex: await updateOrderStatus(session.metadata.orderId, 'PAID');
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
