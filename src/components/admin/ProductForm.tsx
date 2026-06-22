"use client";

import { useState } from "react";
import { ProductData } from "@/app/api/products/route";
import { Plus, Trash, X } from "@phosphor-icons/react";

interface ProductFormProps {
  initialData?: ProductData | null;
  onSave: (product: ProductData) => Promise<void>;
  onCancel: () => void;
  currentFeaturedName?: string;
}

export function ProductForm({ initialData, onSave, onCancel, currentFeaturedName }: ProductFormProps) {
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  
  const [form, setForm] = useState<ProductData>({
    id: initialData?.id || "",
    name: initialData?.name || "",
    price: initialData?.price || 0,
    images: initialData?.images || [""],
    isFeatured: initialData?.isFeatured || false,
    category: initialData?.category || "",
    description: initialData?.description || "",
  });

  const handleAddImage = () => {
    if (form.images.length < 5) {
      setForm({ ...form, images: [...form.images, ""] });
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...form.images];
    newImages[index] = value;
    setForm({ ...form, images: newImages });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = form.images.filter((_, i) => i !== index);
    if (newImages.length === 0) newImages.push("");
    setForm({ ...form, images: newImages });
  };

  const handleFileUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        handleImageChange(index, data.url);
      } else {
        alert(data.error || "Erro no upload");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao fazer upload da imagem");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filtra inputs de imagem vazios
    const cleanImages = form.images.filter(img => img.trim() !== "");
    const finalForm = { ...form, images: cleanImages };

    if (finalForm.isFeatured && !initialData?.isFeatured && currentFeaturedName && currentFeaturedName !== finalForm.name) {
      const confirmed = window.confirm(
        `Atenção: Você vai remover o destaque de "${currentFeaturedName}" e substituí-lo por "${finalForm.name}". Deseja continuar?`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    await onSave(finalForm);
    setSaving(false);
  };

  return (
    <div className="bg-[var(--color-loja-surface)] p-6 rounded-lg border border-gray-100 relative">
      <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-black">
        <X size={24} />
      </button>

      <h2 className="text-xl font-bold mb-6">{initialData ? "Editar Produto" : "Novo Produto"}</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Nome do Produto</label>
          <input 
            type="text" 
            required
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-[var(--color-loja-text)]"
            placeholder="Ex: Camiseta Essential"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Categoria</label>
          <input 
            type="text" 
            value={form.category || ""}
            onChange={(e) => setForm({...form, category: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-[var(--color-loja-text)]"
            placeholder="Ex: Camisetas, Acessórios..."
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Descrição (Opcional)</label>
          <textarea 
            rows={4}
            value={form.description || ""}
            onChange={(e) => setForm({...form, description: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-[var(--color-loja-text)]"
            placeholder="Detalhes, história ou informações adicionais do produto..."
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Preço (R$)</label>
          <input 
            type="number" 
            required
            step="0.01"
            value={form.price || ""}
            onChange={(e) => setForm({...form, price: parseFloat(e.target.value)})}
            className="border border-gray-300 rounded-md px-3 py-2 text-[var(--color-loja-text)]"
            placeholder="Ex: 129.90"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold">Imagens - Máximo 5</label>
            {form.images.length < 5 && (
              <button type="button" onClick={handleAddImage} className="text-xs bg-[var(--color-loja-cta)]/10 text-[var(--color-loja-cta)] px-3 py-1.5 rounded-full flex items-center gap-1 font-bold">
                <Plus size={12} weight="bold" /> Adicionar
              </button>
            )}
          </div>
          {form.images.map((img, index) => (
            <div key={index} className="flex items-center gap-3 bg-white p-2 rounded-md border border-gray-200">
              {img ? (
                <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0 relative border border-gray-200">
                  <img src={img} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-gray-50 rounded-md border border-dashed border-gray-300 flex items-center justify-center shrink-0">
                  {uploadingIndex === index ? (
                    <span className="text-[10px] text-gray-500 font-semibold animate-pulse text-center">Enviando...</span>
                  ) : (
                    <span className="text-gray-400"><Plus size={20} /></span>
                  )}
                </div>
              )}

              <div className="flex-1">
                {img ? (
                   <input 
                     type="text" 
                     value={img}
                     onChange={(e) => handleImageChange(index, e.target.value)}
                     className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 bg-gray-50 focus:bg-white"
                     placeholder="URL da Imagem"
                   />
                ) : (
                   <div className="relative">
                     <label className="w-full block bg-gray-100 hover:bg-gray-200 cursor-pointer text-center text-sm font-semibold text-gray-700 py-2 rounded-md border border-gray-200">
                       {uploadingIndex === index ? "Aguarde..." : "Escolher da Galeria"}
                       <input 
                         type="file" 
                         accept="image/*" 
                         className="hidden" 
                         disabled={uploadingIndex === index}
                         onChange={(e) => {
                           if (e.target.files && e.target.files[0]) {
                             handleFileUpload(index, e.target.files[0]);
                           }
                         }}
                       />
                     </label>
                   </div>
                )}
              </div>

              <button type="button" onClick={() => handleRemoveImage(index)} className="text-gray-400 hover:text-red-500 p-2 bg-gray-50 hover:bg-red-50 rounded-md transition-colors">
                <Trash size={18} />
              </button>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 cursor-pointer mt-2 bg-gray-50 p-4 rounded-md border border-gray-200">
          <input 
            type="checkbox" 
            checked={form.isFeatured}
            onChange={(e) => setForm({...form, isFeatured: e.target.checked})}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-[var(--color-loja-cta)] focus:ring-[var(--color-loja-cta)]"
          />
          <div className="flex flex-col">
            <span className="font-bold text-sm">Colocar como Destaque no Link in Bio</span>
            <span className="text-xs text-[var(--color-loja-muted)]">O produto aparecerá no topo da tela inicial. Apenas 1 produto pode ser destaque por vez.</span>
          </div>
        </label>

        <div className="flex gap-4 mt-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-md font-bold"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={saving}
            className="flex-1 bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] py-3 rounded-md font-bold disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Produto"}
          </button>
        </div>

      </form>
    </div>
  );
}
