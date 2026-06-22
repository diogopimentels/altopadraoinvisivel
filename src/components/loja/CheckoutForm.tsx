"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";

interface CheckoutFormProps {
  onBack: () => void;
}

export function CheckoutForm({ onBack }: CheckoutFormProps) {
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const handleCepBlur = async () => {
    const cleanCep = form.cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: {
            name: form.name,
            phone: form.phone,
            email: form.email,
          },
          address: {
            cep: form.cep,
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
          }
        }),
      });

      const data = await res.json();

      if (data.url) {
        // Redireciona para Stripe
        window.location.href = data.url;
      } else {
        alert(data.error || "Ocorreu um erro no checkout.");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com servidor.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-loja-bg)] relative">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="text-sm font-bold text-gray-500 hover:text-black">
          ← Voltar ao Carrinho
        </button>
        <h2 className="font-extrabold text-lg">Dados de Entrega</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <form id="checkout-form" onSubmit={handleCheckout} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">Nome Completo *</label>
            <input 
              type="text" required 
              value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
              placeholder="Digite seu nome"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-bold text-gray-700">Celular (WhatsApp) *</label>
              <input 
                type="text" required 
                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-bold text-gray-700">E-mail (Opcional)</label>
              <input 
                type="email" 
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="h-px bg-gray-200 my-2"></div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">CEP * {cepLoading && <span className="text-xs text-blue-500 font-normal">Buscando...</span>}</label>
            <input 
              type="text" required maxLength={9}
              value={form.cep} 
              onChange={e => setForm({...form, cep: e.target.value})}
              onBlur={handleCepBlur}
              className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
              placeholder="00000-000"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1 sm:flex-[2]">
              <label className="text-sm font-bold text-gray-700">Rua / Logradouro *</label>
              <input 
                type="text" required 
                value={form.street} onChange={e => setForm({...form, street: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                placeholder="Av. Paulista"
              />
            </div>
            <div className="flex flex-col gap-1 sm:flex-1">
              <label className="text-sm font-bold text-gray-700">Número *</label>
              <input 
                type="text" required 
                value={form.number} onChange={e => setForm({...form, number: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                placeholder="1000"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-bold text-gray-700">Complemento</label>
              <input 
                type="text" 
                value={form.complement} onChange={e => setForm({...form, complement: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                placeholder="Apto 42"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-bold text-gray-700">Bairro *</label>
              <input 
                type="text" required 
                value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                placeholder="Bela Vista"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-24">
            <div className="flex flex-col gap-1 sm:flex-[2]">
              <label className="text-sm font-bold text-gray-700">Cidade *</label>
              <input 
                type="text" required 
                value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors bg-gray-50"
                readOnly
              />
            </div>
            <div className="flex flex-col gap-1 sm:flex-1">
              <label className="text-sm font-bold text-gray-700">Estado *</label>
              <input 
                type="text" required 
                value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors bg-gray-50"
                readOnly
              />
            </div>
          </div>

        </form>
      </div>

      <div className="absolute bottom-0 w-full p-4 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button 
          type="submit"
          form="checkout-form"
          disabled={loading || items.length === 0}
          className="w-full bg-[var(--color-loja-cta)] text-white font-extrabold py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:scale-100"
        >
          {loading ? "Redirecionando..." : "Ir para o Pagamento ➔"}
        </button>
      </div>
    </div>
  );
}
