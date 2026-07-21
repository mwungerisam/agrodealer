import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import { money, fmtDate } from "./i18n";

export interface ReportData {
  title: string;
  period: string;
  branchName: string;
  sales: Array<{ date: string; product: string; qty: number; price: number; profit: number }>;
  purchases: Array<{ date: string; product: string; supplier: string; qty: number; price: number; transport: number }>;
  expenses: Array<{ date: string; description: string; amount: number }>;
  totals: {
    sales: number;
    profit: number;
    purchases: number;
    expenses: number;
    net: number;
  };
}

export function generateReportPdf(r: ReportData) {
  const doc = new jsPDF();
  const opts: Partial<UserOptions> = {
    theme: "grid",
    headStyles: { fillColor: [46, 92, 60], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("UFBC AGRODEALER", 14, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(r.title, 14, 26);
  doc.setFontSize(9);
  doc.text(`Ishami: ${r.branchName}`, 14, 32);
  doc.text(`Igihe: ${r.period}`, 14, 37);

  let y = 45;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Incamake", 14, y);
  y += 3;
  autoTable(doc, {
    ...opts,
    startY: y,
    head: [["", ""]],
    body: [
      ["Igurishwa ryose", money(r.totals.sales)],
      ["Inyungu", money(r.totals.profit)],
      ["Kurangura", money(r.totals.purchases)],
      ["Ibyakoreshejwe", money(r.totals.expenses)],
      ["Inyungu iheruka", money(r.totals.net)],
    ],
    showHead: "never",
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (r.sales.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Kugurisha", 14, y);
    y += 2;
    autoTable(doc, {
      ...opts,
      startY: y + 1,
      head: [["Itariki", "Igicuruzwa", "Ingano", "Igiciro", "Inyungu"]],
      body: r.sales.map((s) => [fmtDate(s.date), s.product, s.qty, money(s.price), money(s.profit)]),
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (r.purchases.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Kurangura", 14, y);
    y += 2;
    autoTable(doc, {
      ...opts,
      startY: y + 1,
      head: [["Itariki", "Igicuruzwa", "Uwatanze", "Ingano", "Igiciro", "Ubwikorezi"]],
      body: r.purchases.map((p) => [
        fmtDate(p.date),
        p.product,
        p.supplier,
        p.qty,
        money(p.price),
        money(p.transport),
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (r.expenses.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Ibyakoreshejwe", 14, y);
    y += 2;
    autoTable(doc, {
      ...opts,
      startY: y + 1,
      head: [["Itariki", "Ibisobanuro", "Amafaranga"]],
      body: r.expenses.map((e) => [fmtDate(e.date), e.description, money(e.amount)]),
    });
  }

  const fname = `${r.title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
}
