import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destinationCep, items } = body;

    if (!destinationCep) {
      return NextResponse.json({ error: "CEP de destino obrigatório" }, { status: 400 });
    }

    // AQUI ENTRARÁ A LÓGICA DE CHAMADA PARA A API DO MELHOR ENVIO NO FUTURO
    // POST https://www.melhorenvio.com.br/api/v2/me/shipment/calculate
    // Usando o token do .env.local

    // POR ENQUANTO, RETORNAMOS OPÇÕES DE FRETE FALSAS PARA TESTARMOS A INTERFACE DE PAGAMENTO
    // Vamos basear o preço no primeiro dígito do CEP só para ter uma variação
    const firstDigit = parseInt(destinationCep.replace(/\D/g, '').charAt(0) || '0');
    
    // Simulação: Norte/Nordeste é mais caro
    const basePac = firstDigit >= 4 && firstDigit <= 6 ? 45.90 : 25.90;
    const baseSedex = firstDigit >= 4 && firstDigit <= 6 ? 75.90 : 45.90;

    const mockShippingOptions = [
      {
        id: "pac-mock",
        name: "PAC (Correios)",
        price: basePac,
        delivery_time: 7,
      },
      {
        id: "sedex-mock",
        name: "Sedex (Correios)",
        price: baseSedex,
        delivery_time: 3,
      }
    ];

    // Simula tempo de rede de 1 segundo para parecer real
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ options: mockShippingOptions });

  } catch (error: any) {
    console.error("Erro na API de Frete:", error);
    return NextResponse.json({ error: "Erro interno ao calcular frete" }, { status: 500 });
  }
}
