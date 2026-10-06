import { formatBRL, formatDateTime, type SalesReport } from "./salesMetrics";

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 32;

const WIN_ANSI: Record<string, number> = {
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201c": 0x93,
  "\u201d": 0x94,
  "\u2022": 0x95,
  "\u20ac": 0x80,
};

function pdfEscape(value: string) {
  const text = value.normalize("NFC").replace(/\u00A0/g, " ");
  let out = "";
  for (const ch of text) {
    const mapped = WIN_ANSI[ch];
    const code = mapped ?? ch.codePointAt(0) ?? 63;
    const byte = code >= 32 && code <= 255 ? code : 63;
    if (byte === 40 || byte === 41 || byte === 92) {
      out += `\\${String.fromCharCode(byte)}`;
    } else if (byte < 32 || byte > 126) {
      out += `\\${byte.toString(8).padStart(3, "0")}`;
    } else {
      out += String.fromCharCode(byte);
    }
  }
  return out;
}

function clip(value: string, width: number, size: number) {
  const max = Math.max(4, Math.floor(width / (size * 0.52)));
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 3))}...`;
}

class PdfWriter {
  private pages: string[][] = [];
  private ops: string[] = [];
  y = PAGE_H - MARGIN;

  constructor() {
    this.ops = [];
  }

  private paint(op: string) {
    this.ops.push(op);
  }

  ensure(space: number) {
    if (this.y - space < MARGIN) this.newPage();
  }

  newPage() {
    this.pages.push(this.ops);
    this.ops = [];
    this.y = PAGE_H - MARGIN;
  }

  text(
    value: string,
    x: number,
    y: number,
    size = 9,
    bold = false,
    rgb = "0.10 0.10 0.10"
  ) {
    const font = bold ? "F2" : "F1";
    this.paint(
      `${rgb} rg BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(value)}) Tj ET`
    );
  }

  fill(x: number, y: number, w: number, h: number, rgb: string) {
    this.paint(`${rgb} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  finish() {
    this.pages.push(this.ops);
    return this.pages.filter((page) => page.length > 0);
  }
}

type Column = { title: string; width: number };

function drawTable(doc: PdfWriter, title: string, columns: Column[], rows: string[][]) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const drawHead = () => {
    doc.ensure(22);
    doc.fill(MARGIN, doc.y - 4, totalWidth, 16, "0.067 0.067 0.067");
    let x = MARGIN + 4;
    for (const column of columns) {
      doc.text(column.title, x, doc.y, 8, true, "1 1 1");
      x += column.width;
    }
    doc.y -= 18;
  };

  doc.ensure(28);
  doc.text(title, MARGIN, doc.y, 12, true);
  doc.y -= 16;
  drawHead();

  const body = rows.length > 0 ? rows : [columns.map((_, index) => (index === 1 ? "Nenhuma venda no período" : "—"))];
  for (const row of body) {
    if (doc.y < MARGIN + 18) {
      doc.newPage();
      drawHead();
    }
    let x = MARGIN + 4;
    row.forEach((cell, index) => {
      const column = columns[index];
      doc.text(clip(cell, column.width - 6, 8), x, doc.y, 8);
      x += column.width;
    });
    doc.y -= 13;
  }
  doc.y -= 10;
}

export function buildSalesPdfBytes(report: SalesReport) {
  const doc = new PdfWriter();
  doc.text("Alto Padrão Invisível — Métricas de vendas", MARGIN, doc.y, 16, true);
  doc.y -= 16;
  doc.text(`${report.periodLabel} · ${report.statusLabel} · Gerado em ${report.generatedAt}`, MARGIN, doc.y, 9, false, "0.35 0.35 0.35");
  doc.y -= 18;

  const summary = [
    `Faturamento: ${formatBRL(report.summary.revenue)}`,
    `Ticket médio: ${formatBRL(report.summary.averageTicket)}`,
    `Pedidos: ${report.summary.orderCount}`,
    `Unidades: ${report.summary.units}`,
    `Subtotal produtos: ${formatBRL(report.summary.productsRevenue)}`,
    `Frete: ${formatBRL(report.summary.shipping)}`,
    `Produtos: ${report.summary.productCount}`,
  ];
  for (const line of summary) {
    doc.text(line, MARGIN, doc.y, 10, true);
    doc.y -= 13;
  }
  doc.y -= 6;

  drawTable(
    doc,
    "Vendas por produto",
    [
      { title: "ID", width: 120 },
      { title: "Produto", width: 220 },
      { title: "Qtd", width: 45 },
      { title: "Pedidos", width: 60 },
      { title: "Faturamento", width: 90 },
      { title: "Preço médio", width: 90 },
      { title: "Parte", width: 55 },
    ],
    report.products.map((product) => [
      product.id,
      product.name,
      String(product.quantity),
      String(product.orderCount),
      formatBRL(product.revenue),
      formatBRL(product.averagePrice),
      `${product.share.toFixed(1)}%`,
    ])
  );

  drawTable(
    doc,
    "Cada venda",
    [
      { title: "Data", width: 105 },
      { title: "Pedido", width: 90 },
      { title: "Cliente", width: 110 },
      { title: "ID", width: 110 },
      { title: "Produto", width: 170 },
      { title: "Qtd", width: 40 },
      { title: "Total", width: 75 },
    ],
    report.lines.map((line) => [
      formatDateTime(line.created_at),
      line.orderId,
      line.customerName,
      line.productId,
      line.paymentStatus === "paid" ? line.productName : `${line.productName} (pendente)`,
      String(line.quantity),
      formatBRL(line.lineTotal),
    ])
  );

  const pages = doc.finish();
  return assemblePdf(pages.length > 0 ? pages : [["BT /F1 12 Tf 32 560 Td (Sem dados) Tj ET"]]);
}

function assemblePdf(pages: string[][]) {
  const objects = new Map<number, string>();
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const pageIds: number[] = [];
  let nextId = 5;
  pages.forEach((ops, index) => {
    const content = `${ops.join("\n")}\n`;
    const contentId = nextId++;
    const pageId = nextId++;
    pageIds.push(pageId);
    objects.set(contentId, `<< /Length ${content.length} >>\nstream\n${content}endstream`);
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    void index;
  });

  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");

  const maxId = Math.max(...objects.keys());
  let pdf = "%PDF-1.4\n";
  const offsets = new Array<number>(maxId + 1).fill(0);
  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${maxId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= maxId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

export async function downloadSalesPdf(report: SalesReport) {
  const bytes = buildSalesPdfBytes(report);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vendas-altopadrao-${report.generatedAt.replace(/[^\d]/g, "").slice(0, 12) || "relatorio"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
