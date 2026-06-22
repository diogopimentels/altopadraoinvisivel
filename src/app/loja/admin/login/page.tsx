"use client";

import { useState } from "react";
import { loginAction } from "../actions";
import { Eye, EyeSlash } from "@phosphor-icons/react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-loja-bg)] px-4">
      <div className="w-full max-w-sm bg-[var(--color-loja-surface)] p-8 rounded-xl border border-gray-100 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-[var(--color-loja-text)] mb-2">Acesso Restrito</h1>
        <p className="text-[var(--color-loja-muted)] text-sm mb-8">Insira sua senha para gerenciar a loja.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Digite a senha"
              required
              className="w-full border border-gray-300 rounded-md px-4 py-3 text-center tracking-widest text-[var(--color-loja-text)] focus:ring-[var(--color-loja-cta)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
            >
              {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-loja-cta)] text-[var(--color-loja-cta-text)] py-3 rounded-md font-bold disabled:opacity-50 transition-opacity"
          >
            {loading ? "Verificando..." : "Entrar no Painel"}
          </button>
        </form>
      </div>
    </div>
  );
}
