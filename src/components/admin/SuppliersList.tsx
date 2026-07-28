"use client";

import { useEffect, useState } from "react";
import { Plus, PencilSimple, Trash, X } from "@phosphor-icons/react";
import type { SupplierData } from "@/app/api/suppliers/route";

const emptyForm: Omit<SupplierData, "id"> & { id?: string } = {
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
  notes: "",
};

export function SuppliersList() {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const cleanCep = form.cep.replace(/\D/g, "");
    if (cleanCep.length !== 8 || cepLoading) return;

    const run = async () => {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCepLoading(false);
      }
    };
    run();
  }, [form.cep]);

  const openNew = () => {
    setForm({ ...emptyForm });
    setEditing(true);
  };

  const openEdit = (s: SupplierData) => {
    setForm({ ...s });
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao salvar fornecedor");
        return;
      }
      setEditing(false);
      setForm({ ...emptyForm });
      await fetchSuppliers();
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este fornecedor? Produtos ligados ficarão sem origem.")) return;
    await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
    await fetchSuppliers();
  };

  if (loading) {
    return <div className="text-center p-8 text-gray-500 font-bold">Carregando fornecedores...</div>;
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex flex-col gap-4 bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{form.id ? "Editar fornecedor" : "Novo fornecedor"}</h2>
          <button type="button" onClick={() => setEditing(false)} className="p-2 text-gray-500 hover:text-black">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">Nome *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-300 rounded-lg p-3"
            placeholder="Ex: Fornecedor SP Centro"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">Telefone</label>
            <input
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border border-gray-300 rounded-lg p-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">E-mail</label>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-gray-300 rounded-lg p-3"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">
            CEP de origem * {cepLoading && <span className="text-xs text-blue-500 font-normal">Buscando...</span>}
          </label>
          <input
            required
            maxLength={9}
            value={form.cep}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, "");
              if (val.length > 5) val = `${val.slice(0, 5)}-${val.slice(5, 8)}`;
              setForm({ ...form, cep: val });
            }}
            className="border border-gray-300 rounded-lg p-3"
            placeholder="00000-000"
          />
          <p className="text-xs text-gray-500">Este CEP é a origem do frete Melhor Envio para produtos deste fornecedor.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-bold">Rua *</label>
            <input
              required
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              className="border border-gray-300 rounded-lg p-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">Número *</label>
            <input
              required
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              className="border border-gray-300 rounded-lg p-3"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">Complemento</label>
            <input
              value={form.complement || ""}
              onChange={(e) => setForm({ ...form, complement: e.target.value })}
              className="border border-gray-300 rounded-lg p-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">Bairro *</label>
            <input
              required
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              className="border border-gray-300 rounded-lg p-3"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-bold">Cidade *</label>
            <input
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="border border-gray-300 rounded-lg p-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">UF *</label>
            <input
              required
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              className="border border-gray-300 rounded-lg p-3"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">Observações</label>
          <textarea
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="border border-gray-300 rounded-lg p-3 min-h-[80px]"
            placeholder="Contato interno, prazo de despacho..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar fornecedor"}
        </button>
      </form>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <button
        onClick={openNew}
        className="flex items-center justify-center w-fit px-6 gap-2 bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] py-3 rounded-xl text-sm font-bold shadow-md"
      >
        <Plus size={18} weight="bold" /> Novo Fornecedor
      </button>

      {suppliers.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          Nenhum fornecedor cadastrado. Cadastre a origem do frete antes de vincular produtos.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-gray-200 rounded-lg bg-[var(--color-loja-surface)]"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800">{s.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  CEP {s.cep} — {s.street}, {s.number} — {s.neighborhood}, {s.city}/{s.state}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => openEdit(s)}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                  aria-label="Editar"
                >
                  <PencilSimple size={20} weight="fill" />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-3 bg-red-50 hover:bg-red-100 rounded-full text-red-600"
                  aria-label="Excluir"
                >
                  <Trash size={20} weight="fill" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
