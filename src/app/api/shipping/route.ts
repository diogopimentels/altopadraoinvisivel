import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destinationCep, items } = body;

    if (!destinationCep) {
      return NextResponse.json({ error: "CEP de destino obrigatório" }, { status: 400 });
    }

    // Real Melhor Envio API Call
    const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN;
    if (!token) {
      console.warn("Token do Melhor Envio não configurado, usando fallback.");
      return NextResponse.json({ options: [] });
    }

    const payload = {
      from: {
        postal_code: process.env.STORE_CEP || "01001000" // Padrão SP caso não configurado
      },
      to: {
        postal_code: destinationCep.replace(/\D/g, '')
      },
      products: items.map((item: any) => ({
        id: item.id,
        width: item.width || 20,
        height: item.height || 15,
        length: item.length || 20,
        weight: item.weight || 0.5,
        insurance_value: item.price,
        quantity: item.quantity
      }))
    };

    const url = process.env.MELHOR_ENVIO_ENVIRONMENT === 'sandbox' 
      ? 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate' 
      : 'https://melhorenvio.com.br/api/v2/me/shipment/calculate';

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "AltoPadraoInvisivel (suporte@altopadraoinvisivel.com.br)"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Melhor Envio API Error:", response.status, errText);
      return NextResponse.json({ error: "Erro na API do Melhor Envio" }, { status: 500 });
    }

    const melhorenvioData = await response.json();

    // Filtra apenas Correios (PAC e Sedex) para não poluir muito, 
    // ou transportadoras específicas.
    // IDs comuns: 1 = PAC, 2 = Sedex.
    const allowedServices = [1, 2]; 

    const options = melhorenvioData
      .filter((opt: any) => !opt.error && allowedServices.includes(opt.id))
      .map((opt: any) => ({
        id: String(opt.id),
        name: opt.name,
        price: parseFloat(opt.price),
        delivery_time: opt.custom_delivery_time || opt.delivery_time,
        company: opt.company?.name || "Correios"
      }));

    if (options.length === 0) {
      return NextResponse.json({ 
        options: [], 
        error: "Nenhuma opção de frete disponível para este CEP." 
      });
    }

    return NextResponse.json({ options });

  } catch (error: any) {
    console.error("Erro na API de Frete:", error);
    return NextResponse.json({ error: "Erro interno ao calcular frete" }, { status: 500 });
  }
}
