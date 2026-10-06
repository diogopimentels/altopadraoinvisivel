"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePdf, Printer } from "@phosphor-icons/react";
import {
  buildSalesReport,
  formatBRL,
  formatDateTime,
  type PeriodPreset,
  type StatusFilter,
} from "@/lib/salesMetrics";

const presets: { id: PeriodPreset; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "90", label: "90 dias" },
  { id: "custom", label: "Período" },
];

export function SalesMetrics() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [status, setStatus] = useState<StatusFilter>("paid");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Não foi possível carregar as vendas.");
        }
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setOrders([]);
          setError(err instanceof Error ? err.message : "Erro ao carregar vendas.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(
    () => buildSalesReport(orders, { preset, customFrom, customTo, status }),
    [orders, preset, customFrom, customTo, status]
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { downloadSalesPdf } = await import("@/lib/salesReportPdf");
      await downloadSalesPdf(report);
    } catch (err) {
      console.error(err);
      alert("Não foi possível gerar o PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-gray-500 font-bold">Carregando métricas...</div>;
  }

  return (
    <div data-sales-report className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--color-loja-text)]">Métricas de vendas</h2>
          <p className="text-xs text-[var(--color-loja-muted)] mt-1">
            {report.periodLabel} · {report.statusLabel}
          </p>
        </div>

        <div data-print-hide className="flex flex-col gap-2">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setStatus("paid")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold ${status === "paid" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
            >
              Pagos
            </button>
            <button
              type="button"
              onClick={() => setStatus("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold ${status === "all" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
            >
              Todos
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {presets.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreset(item.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  preset === item.id ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 bg-black text-white text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              <FilePdf size={18} weight="fill" />
              {downloading ? "Gerando..." : "Baixar PDF"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white border border-gray-200 text-sm font-bold px-4 py-2.5 rounded-lg"
            >
              <Printer size={18} weight="fill" />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 text-sm font-semibold rounded-xl p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Faturamento" value={formatBRL(report.summary.revenue)} emphasis />
        <MetricCard label="Ticket médio" value={formatBRL(report.summary.averageTicket)} emphasis />
        <MetricCard label="Pedidos" value={String(report.summary.orderCount)} />
        <MetricCard label="Unidades" value={String(report.summary.units)} />
        <MetricCard label="Subtotal produtos" value={formatBRL(report.summary.productsRevenue)} />
        <MetricCard label="Frete" value={formatBRL(report.summary.shipping)} />
      </div>

      {report.pendingAside.count > 0 && (
        <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 font-semibold">
          {report.pendingAside.count} pedido(s) aguardando pagamento ({formatBRL(report.pendingAside.total)}) fora deste relatório.
        </p>
      )}

      <section className="border border-gray-200 rounded-xl bg-[var(--color-loja-surface)] overflow-hidden">
        <h3 className="px-4 py-3 text-sm font-extrabold">Vendas por produto</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-bold">ID</th>
                <th className="px-3 py-2 font-bold">Produto</th>
                <th className="px-3 py-2 font-bold">Qtd</th>
                <th className="px-3 py-2 font-bold">Pedidos</th>
                <th className="px-3 py-2 font-bold">Faturamento</th>
                <th className="px-3 py-2 font-bold">Preço médio</th>
                <th className="px-3 py-2 font-bold">Parte</th>
              </tr>
            </thead>
            <tbody>
              {report.products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500 font-semibold">
                    Nenhuma venda neste período.
                  </td>
                </tr>
              ) : (
                report.products.map((product) => (
                  <tr key={product.id} className="border-t border-gray-100 bg-white">
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{product.id}</td>
                    <td className="px-3 py-2 font-semibold">{product.name}</td>
                    <td className="px-3 py-2">{product.quantity}</td>
                    <td className="px-3 py-2">{product.orderCount}</td>
                    <td className="px-3 py-2 font-bold">{formatBRL(product.revenue)}</td>
                    <td className="px-3 py-2">{formatBRL(product.averagePrice)}</td>
                    <td className="px-3 py-2">{product.share.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-gray-200 rounded-xl bg-[var(--color-loja-surface)] overflow-hidden">
        <h3 className="px-4 py-3 text-sm font-extrabold">Cada venda</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-bold">Data</th>
                <th className="px-3 py-2 font-bold">Pedido</th>
                <th className="px-3 py-2 font-bold">Cliente</th>
                <th className="px-3 py-2 font-bold">ID</th>
                <th className="px-3 py-2 font-bold">Produto</th>
                <th className="px-3 py-2 font-bold">Qtd</th>
                <th className="px-3 py-2 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500 font-semibold">
                    Nenhuma venda neste período.
                  </td>
                </tr>
              ) : (
                report.lines.map((line, index) => (
                  <tr key={`${line.orderId}-${line.productId}-${index}`} className="border-t border-gray-100 bg-white">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{formatDateTime(line.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{line.orderId.replace(/^ord_/, "")}</td>
                    <td className="px-3 py-2">{line.customerName}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{line.productId}</td>
                    <td className="px-3 py-2 font-semibold">
                      {line.productName}
                      {status === "all" && line.paymentStatus !== "paid" && (
                        <span className="ml-2 text-[10px] uppercase font-bold text-yellow-800">pendente</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{line.quantity}</td>
                    <td className="px-3 py-2 font-bold">{formatBRL(line.lineTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] text-gray-400 print:text-black">Gerado em {report.generatedAt}</p>
    </div>
  );
}

function MetricCard({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="border border-gray-200 rounded-xl bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-bold">{label}</p>
      <p className={`mt-1 font-extrabold ${emphasis ? "text-lg" : "text-base"}`}>{value}</p>
    </div>
  );
}
