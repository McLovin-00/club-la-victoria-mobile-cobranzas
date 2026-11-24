export interface Rendicion {
  cobrador: string;
  desde: string;
  hasta: string;
  totalVerificadoCentavos: number;
  cantidadImporteNoVerificable: number;
  porMetodo: Array<{ metodo: string; centavos: number }>;
  cobros: Array<{
    id: number;
    fecha: string;
    socio: string;
    conceptos: string[];
    recibidoCentavos: number | null;
    creditoAplicadoCentavos?: number;
    creditoGeneradoCentavos?: number;
    metodos: Array<{ metodo: string; centavos: number }>;
  }>;
}

const moneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pesos = (centavos: number) => moneda.format(centavos / 100);

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "short",
  timeStyle: "short",
});

const fechaLocal = (iso: string) => iso.split("-").reverse().join("/");

const texto = (valor: string) =>
  valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");


const creditoTotal = (rendicion: Rendicion): number =>
  rendicion.cobros.reduce((suma, cobro) => suma + (cobro.creditoAplicadoCentavos ?? 0), 0);

const generadoTotal = (rendicion: Rendicion): number =>
  rendicion.cobros.reduce((suma, cobro) => suma + (cobro.creditoGeneradoCentavos ?? 0), 0);

const notaSaldoAFavor = (rendicion: Rendicion): string =>
  [
    "Importe recibido es el dinero efectivamente cobrado.",
    creditoTotal(rendicion) > 0
      ? "Las cuotas canceladas con saldo a favor del socio no suman al total recaudado."
      : "",
    generadoTotal(rendicion) > 0
      ? "El saldo a favor dejado por el socio está incluido en el importe recibido: es dinero cobrado de más que queda a su favor."
      : "",
  ].filter(Boolean).join(" ");

const lineasMetodos = (cobro: Rendicion["cobros"][number]): string[] => [
  ...cobro.metodos.map(({ metodo, centavos }) => `${metodo}: ${pesos(centavos)}`),
  ...((cobro.creditoAplicadoCentavos ?? 0) > 0
    ? [`Saldo a favor aplicado: ${pesos(cobro.creditoAplicadoCentavos ?? 0)}`]
    : []),
  ...((cobro.creditoGeneradoCentavos ?? 0) > 0
    ? [`Deja saldo a favor: ${pesos(cobro.creditoGeneradoCentavos ?? 0)}`]
    : []),
];

export function nombreArchivoRendicion(
  cobradorId: number | string,
  rendicion: Pick<Rendicion, "desde" | "hasta">,
): string {
  return `rendicion-${cobradorId}-${rendicion.desde}_${rendicion.hasta}.pdf`;
}

/**
 * Genera exactamente el mismo documento PDF (jsPDF + jspdf-autotable)
 * que el frontend web en `lib/utils/rendicion-pdf.ts`.
 */
export async function crearDocumentoPdfRendicion(rendicion: Rendicion) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default ?? (autoTableModule as unknown as typeof autoTableModule.default);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({ title: "Rendición de cobranzas", author: "Club La Victoria" });
  doc.setFontSize(18);
  doc.text("Rendición de cobranzas", 40, 42);
  doc.setFontSize(11);
  doc.text(`Club La Victoria | ${rendicion.cobrador}`, 40, 63);
  doc.text(`${fechaLocal(rendicion.desde)} al ${fechaLocal(rendicion.hasta)}`, 40, 80);

  autoTable(doc, {
    startY: 96,
    head: [["Método de pago", "Importe"]],
    body: [
      ...rendicion.porMetodo.map(({ metodo, centavos }) => [metodo, pesos(centavos)]),
      [
        rendicion.cantidadImporteNoVerificable ? "Total verificable (parcial)" : "Total recaudado",
        pesos(rendicion.totalVerificadoCentavos),
      ],
      ...(generadoTotal(rendicion) > 0
        ? [["Saldo a favor dejado por los socios (incluido en el total)", pesos(generadoTotal(rendicion))]]
        : []),
      ...(creditoTotal(rendicion) > 0
        ? [["Cuotas canceladas con saldo a favor (no suma al total)", pesos(creditoTotal(rendicion))]]
        : []),
    ],
    margin: { left: 40, right: 40 },
    columnStyles: { 1: { halign: "right" } },
  });

  const tablaTotales = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable;

  autoTable(doc, {
    startY: tablaTotales.finalY + 18,
    head: [["Fecha", "Socio y conceptos", "Métodos", "Importe recibido"]],
    body:
      rendicion.cobros.length === 0
        ? [[{ content: "No se registraron cobros en el período seleccionado.", colSpan: 4 }]]
        : rendicion.cobros.map((cobro) => [
            fechaHora.format(new Date(cobro.fecha)),
            [`#${cobro.id} · ${cobro.socio}`, ...cobro.conceptos].join("\n"),
            lineasMetodos(cobro).join("\n") || "—",
            cobro.recibidoCentavos === null ? "Importe no verificable" : pesos(cobro.recibidoCentavos),
          ]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9, overflow: "linebreak", valign: "top" },
    columnStyles: {
      0: { cellWidth: 78 },
      2: { cellWidth: 135 },
      3: { cellWidth: 93, halign: "right" },
    },
  });

  if (creditoTotal(rendicion) > 0 || generadoTotal(rendicion) > 0) {
    const detalle = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable;
    const nota = doc.splitTextToSize(notaSaldoAFavor(rendicion), doc.internal.pageSize.getWidth() - 80);
    let y = detalle.finalY + 16;
    if (y + nota.length * 11 > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 50;
    }
    doc.setFontSize(8);
    doc.text(nota, 40, y);
  }

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    doc.setFontSize(9);
    doc.text(
      `${pagina} / ${paginas}`,
      doc.internal.pageSize.getWidth() - 40,
      doc.internal.pageSize.getHeight() - 19,
      { align: "right" },
    );
  }

  return doc;
}

export function htmlRendicion(rendicion: Rendicion): string {
  const filas =
    rendicion.cobros.length === 0
      ? '<tr><td colspan="4">No se registraron cobros en el período seleccionado.</td></tr>'
      : rendicion.cobros
          .map(
            (cobro) => `<tr>
        <td>${texto(fechaHora.format(new Date(cobro.fecha)))}</td>
        <td>#${cobro.id} · ${texto(cobro.socio)}<br>${cobro.conceptos.map(texto).join("<br>")}</td>
        <td>${lineasMetodos(cobro).map(texto).join("<br>") || "—"}</td>
        <td style="text-align:right">${cobro.recibidoCentavos === null ? "Importe no verificable" : pesos(cobro.recibidoCentavos)}</td>
      </tr>`,
          )
          .join("");
  const metodos = rendicion.porMetodo
    .map((item) => `<tr><td>${texto(item.metodo)}</td><td style="text-align:right">${pesos(item.centavos)}</td></tr>`)
    .join("");
  const total = rendicion.cantidadImporteNoVerificable ? "Total verificable (parcial)" : "Total recaudado";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Rendición de cobranzas</title>
    <style>body{font-family:sans-serif;color:#111;padding:24px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th{background:#2980b9;color:#fff;padding:7px;text-align:left}td{border-bottom:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}h1{font-size:22px;margin:0 0 8px}</style>
    </head><body><h1>Rendición de cobranzas</h1><p>Club La Victoria | ${texto(rendicion.cobrador)}<br>${texto(fechaLocal(rendicion.desde))} al ${texto(fechaLocal(rendicion.hasta))}</p>
    <table><tr><th>Método de pago</th><th style="text-align:right">Importe</th></tr>${metodos}<tr><th>${total}</th><th style="text-align:right">${pesos(rendicion.totalVerificadoCentavos)}</th></tr></table>
    <table><tr><th>Fecha</th><th>Socio y conceptos</th><th>Métodos</th><th style="text-align:right">Importe recibido</th></tr>${filas}</table></body></html>`;
}
