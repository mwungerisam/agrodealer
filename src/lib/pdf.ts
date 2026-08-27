// Report generation helpers — PDF and CSV export.
// Uses jsPDF (pre-installed via shadcn) and native CSV blob.

import { t, money } from "@/lib/i18n";

interface PdfOpts {
  title: string;
  period: string;
  branchName: string;
  sales: Array<{
    date: string;
    product: string;
    customer: string;
    qty: number;
    price: number;
    profit: number;
  }>;
  purchases: Array<{
    date: string;
    product: string;
    supplier: string;
    qty: number;
    price: number;
    transport: number;
  }>;
  expenses: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
  totals: {
    sales: number;
    profit: number;
    purchases: number;
    expenses: number;
    net: number;
    customers: number;
  };
}

export async function generateReportPdf(opts: PdfOpts) {
  // Lazy-load jsPDF so it's only loaded when export is requested.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setFontSize(10);
  doc.text(`UFBC AGRODEALER — ${opts.title}`, 105, 15, { align: "center" });
  doc.setFontSize(8);
  doc.text(`${opts.period} · ${opts.branchName}`, 105, 22, { align: "center" });

  let y = 32;

  // Sales
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("KUGURISHA", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  (opts.sales || []).slice(0, 25).forEach((s) => {
    if (y > 270) { doc.addPage(); y = 12; }
    doc.text(
      `${s.date} - ${s.product} - ${s.customer} - ${s.qty} - ${s.price} - ${money(s.profit)}`,
      14,
      y,
    );
    y += 3.5;
  });

  // Purchases
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("KURANGURA", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  (opts.purchases || []).slice(0, 25).forEach((p) => {
    if (y > 270) { doc.addPage(); y = 12; }
    doc.text(
      `${p.date} · ${p.product} · ${p.supplier} · ${p.qty} · ${p.price} · trans: ${money(p.transport)}`,
      14,
      y,
    );
    y += 3.5;
  });

  // Expenses
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("IBYAKORESHWA", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  (opts.expenses || []).slice(0, 25).forEach((e) => {
    if (y > 270) { doc.addPage(); y = 12; }
    doc.text(`${e.date} · ${e.description} · ${money(e.amount)}`, 14, y);
    y += 3.5;
  });

  // Totals
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Igurisha: ${money(opts.totals.sales)}`, 14, y);
  doc.text(`Inyungu: ${money(opts.totals.profit)}`, 60, y);
  doc.text(`Kurangura: ${money(opts.totals.purchases)}`, 95, y);
  doc.text(`Ibyakoreshejwe: ${money(opts.totals.expenses)}`, 140, y);
  y += 5;
  doc.text(`Inyungu iheruka: ${money(opts.totals.net)}`, 14, y);
  y += 5;
  doc.text(`Abakiriya: ${opts.totals.customers}`, 14, y);

  doc.save(`${opts.title.replace(/\s+/g, "_")}.pdf`);
}

export function generateCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
