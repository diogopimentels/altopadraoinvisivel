import { NextResponse } from 'next/server';
import { quoteShipping } from '@/lib/shippingQuote';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destinationCep, items } = body;

    if (!destinationCep) {
      return NextResponse.json({ error: 'CEP de destino obrigatório' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
    }

    // Só aceita id + quantity do cliente; preços/dims/CEP vêm do banco
    const safeItems = (items as any[]).map((item) => ({
      id: String(item.id),
      quantity: Number(item.quantity) || 1,
    }));

    const result = await quoteShipping(String(destinationCep), safeItems);

    if (!result.ok) {
      return NextResponse.json(
        { options: [], error: result.error, details: result.details },
        { status: 200 }
      );
    }

    return NextResponse.json({
      options: result.options,
      suppliers_count: result.suppliers_count,
    });
  } catch (error: any) {
    console.error('Erro na API de Frete:', error);
    return NextResponse.json(
      { options: [], error: error?.message || 'Erro interno ao calcular frete' },
      { status: 500 }
    );
  }
}
