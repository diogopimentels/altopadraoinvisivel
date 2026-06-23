"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

interface CheckoutFormProps {
  onBack: () => void;
}

export function CheckoutForm({ onBack }: CheckoutFormProps) {
  const { items, clearCart, shippingOption, setShippingOption } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [shippingError, setShippingError] = useState("");

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

  useEffect(() => {
    const cleanCep = form.cep.replace(/\D/g, "");
    if (cleanCep.length === 8 && !cepLoading) {
      const fetchCep = async () => {
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

            // Busca as opções de frete
            try {
              const shipRes = await fetch("/api/shipping", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destinationCep: cleanCep, items })
              });
              const shipData = await shipRes.json();
              if (shipData.options && shipData.options.length > 0) {
                setShippingOptions(shipData.options);
                setShippingOption(shipData.options[0]); // Seleciona o primeiro por padrão
                setShippingError("");
              } else {
                setShippingOptions([]);
                setShippingError(shipData.error || "Erro ao calcular o frete.");
              }
            } catch(e) {
              console.error("Erro ao calcular frete", e);
              setShippingOptions([]);
              setShippingError("Erro de conexão ao calcular o frete.");
            }
          }
        } catch (err) {
          console.error("Erro ao buscar CEP", err);
        } finally {
          setCepLoading(false);
        }
      };
      fetchCep();
    }
  }, [form.cep]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingOption,
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
          
          {/* PERSONAL INFO - ALWAYS VISIBLE AT THE TOP */}
          <div className="flex flex-col gap-4 mb-2">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">1. Seus Dados</h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-gray-700">Nome Completo *</label>
              <input 
                type="text" required 
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                placeholder="Seu nome"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-bold text-gray-700">Celular (WhatsApp) *</label>
                <input 
                  type="text" required maxLength={15}
                  value={form.phone} 
                  onChange={e => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val.length > 11) val = val.slice(0, 11);
                    if (val.length > 2) val = `(${val.slice(0,2)}) ${val.slice(2)}`;
                    if (val.length > 10) val = `${val.slice(0,10)}-${val.slice(10)}`;
                    setForm({...form, phone: val});
                  }}
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
          </div>

          <div className="h-px bg-gray-200"></div>

          <div className="flex flex-col gap-1 mt-2">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-2">2. Entrega</h3>
            <label className="text-sm font-bold text-gray-700">Qual seu CEP? * {cepLoading && <span className="text-xs text-blue-500 font-normal">Buscando...</span>}</label>
            <input 
              type="text" required maxLength={9}
              value={form.cep} 
              onChange={e => {
                let val = e.target.value.replace(/\D/g, "");
                if (val.length > 5) val = `${val.slice(0,5)}-${val.slice(5,8)}`;
                setForm({...form, cep: val});
              }}
              className="border-2 border-gray-300 rounded-xl p-4 outline-none focus:border-black transition-colors font-medium text-lg"
              placeholder="00000-000"
            />
          </div>

          {form.cep.replace(/\D/g, "").length === 8 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-500 mt-4">
              <div className="h-px bg-gray-200"></div>
              
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">2. Complete seu endereço</h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-1 sm:flex-[2]">
                  <label className="text-sm font-bold text-gray-700">Rua / Logradouro *</label>
                  <input 
                    type="text" required 
                    value={form.street} onChange={e => setForm({...form, street: e.target.value})}
                    className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                    placeholder="Sua rua"
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
                    placeholder="Apto, Bloco..."
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-bold text-gray-700">Bairro *</label>
                  <input 
                    type="text" required 
                    value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})}
                    className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                    placeholder="Seu bairro"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-1 sm:flex-[2]">
                  <label className="text-sm font-bold text-gray-700">Cidade *</label>
                  <input 
                    type="text" required 
                    value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                    className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:flex-1">
                  <label className="text-sm font-bold text-gray-700">Estado *</label>
                  <input 
                    type="text" required 
                    value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                    className="border border-gray-300 rounded-lg p-3 outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SHIPPING OPTIONS */}
          {shippingOptions.length > 0 && form.cep.replace(/\D/g, "").length === 8 && (
            <div className="flex flex-col gap-3 mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">3. Escolha o Frete</h3>
              <div className="flex flex-col gap-2">
                {shippingOptions.map((opt) => (
                  <button 
                    type="button"
                    key={opt.id} 
                    onClick={() => setShippingOption(opt)}
                    className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all w-full text-left ${shippingOption?.id === opt.id ? 'border-[var(--color-loja-cta)] bg-[var(--color-loja-cta)]/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${shippingOption?.id === opt.id ? 'border-[var(--color-loja-cta)]' : 'border-gray-300'}`}>
                        {shippingOption?.id === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-loja-cta)]" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--color-loja-text)]">{opt.name}</span>
                        <span className="text-sm text-gray-500">Chega em até {opt.delivery_time} dias úteis</span>
                      </div>
                    </div>
                    <span className="font-extrabold text-lg text-[var(--color-loja-text)] shrink-0">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opt.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SHIPPING ERROR */}
          {shippingError && form.cep.replace(/\D/g, "").length === 8 && !cepLoading && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <h3 className="font-bold text-red-800 text-sm">Ops! Problema com o Frete</h3>
              <p className="text-sm text-red-600 mt-1">{shippingError}</p>
              <p className="text-xs text-red-500 mt-2">Dica: Se você estiver testando na sua máquina, reinicie o servidor para carregar as chaves corretas.</p>
            </div>
          )}

          {/* ESPAÇO NO FINAL */}
          <div className="mb-24"></div>

        </form>
      </div>

      <div className="absolute bottom-0 w-full p-4 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button 
          type="submit"
          form="checkout-form"
          disabled={loading || items.length === 0 || !shippingOption || !form.name || !form.phone || form.cep.replace(/\D/g, "").length !== 8}
          className="w-full bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] font-extrabold py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:scale-100"
        >
          {loading ? "Redirecionando..." : `Pagar ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(items.reduce((acc, item) => acc + (item.price * item.quantity), 0) + (shippingOption ? shippingOption.price : 0))} ➔`}
        </button>
      </div>
    </div>
  );
}
