"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Copy, Check } from "@phosphor-icons/react";

export function OrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error("Erro ao buscar pedidos", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const handleCopyAddress = (order: any) => {
    const textToCopy = `📦 PEDIDO: ${order.id.replace('ord_', '')}
👤 NOME: ${order.customer_name}
📱 WHATSAPP: ${order.customer_phone}

📍 ENDEREÇO DE ENTREGA:
Rua: ${order.address_street}, ${order.address_number}
Complemento: ${order.address_complement || "Nenhum"}
Bairro: ${order.address_neighborhood}
CEP: ${order.address_cep}
Cidade/UF: ${order.address_city} - ${order.address_state}
`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <div className="text-center p-8 text-gray-500 font-bold">Carregando pedidos...</div>;

  if (orders.length === 0) {
    return (
      <div className="text-center p-12 border border-gray-200 rounded-xl bg-[var(--color-loja-surface)]">
        <p className="text-gray-500 font-semibold">Nenhum pedido encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {orders.map((order) => (
        <div key={order.id} className="bg-[var(--color-loja-surface)] border border-gray-200 p-5 rounded-xl shadow-sm">
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                {order.customer_name}
                {order.payment_status === 'paid' ? (
                  <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle weight="fill" size={12} /> Pago
                  </span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle weight="regular" size={12} /> Aguardando Pagamento
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(order.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="block font-bold text-lg text-[var(--color-loja-text)]">
                Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
              </span>
              <span className="block text-xs text-green-600 font-bold mt-1">
                Lucro Líquido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount - (order.shipping_cost || 0))}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Frete: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.shipping_cost || 0)}
              </span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-md border border-gray-100 mb-4">
            <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Itens do Pedido</h4>
            <div className="flex flex-col gap-2">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700">{item.quantity}x {item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => handleCopyAddress(order)}
            className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {copiedId === order.id ? (
              <>
                <Check size={20} weight="bold" />
                Copiado!
              </>
            ) : (
              <>
                <Copy size={20} weight="bold" />
                Copiar Endereço de Entrega
              </>
            )}
          </button>

        </div>
      ))}
    </div>
  );
}
