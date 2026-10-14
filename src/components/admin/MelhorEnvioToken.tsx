"use client";

import { useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";

type TokenStatus = {
  connected: boolean;
  expiresAt: string | null;
  expired: boolean;
};

const notices: Record<string, string> = {
  ok: "Token do Melhor Envio atualizado.",
  auth: "Entra no admin antes de renovar o token.",
  state: "A autorização expirou. Clica em renovar de novo.",
  erro: "Não foi possível gravar o token novo. Tenta de novo.",
};

export function MelhorEnvioToken() {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const me = new URLSearchParams(window.location.search).get("me");
    if (me && notices[me]) setNotice(notices[me]);

    let cancelled = false;
    fetch("/api/melhor-envio/status")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "falha");
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const expiresLabel = status?.expiresAt
    ? new Date(status.expiresAt).toLocaleDateString("pt-BR")
    : null;

  return (
    <div data-print-hide className="border border-gray-200 rounded-xl bg-white px-4 py-3 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">Frete Melhor Envio</p>
          <p className="text-xs text-gray-500 mt-1">
            {!status
              ? "Conferindo token..."
              : !status.connected
                ? "Nenhum token salvo."
                : status.expired
                  ? "Token vencido. O frete não calcula até renovar."
                  : `Token válido até ${expiresLabel}. A loja renova sozinha antes disso.`}
          </p>
        </div>
        <a
          href="/api/melhor-envio/connect"
          className="inline-flex items-center justify-center gap-2 bg-black text-white text-sm font-bold px-4 py-2.5 rounded-lg shrink-0"
        >
          <ArrowsClockwise size={16} weight="bold" />
          Renovar token
        </a>
      </div>
      {notice && (
        <p className={`text-xs font-semibold ${notice === notices.ok ? "text-green-700" : "text-red-600"}`}>
          {notice}
        </p>
      )}
    </div>
  );
}
