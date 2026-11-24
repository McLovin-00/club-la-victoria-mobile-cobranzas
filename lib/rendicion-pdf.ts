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
    metodos: Array<{ metodo: string; centavos: number }>;
  }>;
}

const pesos = (centavos: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));

const texto = (valor: string) =>
  valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function htmlRendicion(rendicion: Rendicion): string {
  const filas = rendicion.cobros.length === 0
    ? "<tr><td colspan=\"4\">No se registraron cobros en el período seleccionado.</td></tr>"
    : rendicion.cobros.map((cobro) => `<tr>
        <td>${texto(fecha(cobro.fecha))}</td>
        <td>#${cobro.id} · ${texto(cobro.socio)}<br>${cobro.conceptos.map(texto).join("<br>")}</td>
        <td>${cobro.metodos.map((item) => `${texto(item.metodo)}: ${pesos(item.centavos)}`).join("<br>") || "—"}</td>
        <td>${cobro.recibidoCentavos === null ? "Importe no verificable" : pesos(cobro.recibidoCentavos)}</td>
      </tr>`).join("");
  const metodos = rendicion.porMetodo
    .map((item) => `<tr><td>${texto(item.metodo)}</td><td>${pesos(item.centavos)}</td></tr>`)
    .join("");
  const total = rendicion.cantidadImporteNoVerificable ? "Total verificable (parcial)" : "Total recaudado";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Rendición de cobranzas</title>
    <style>body{font-family:sans-serif;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}h1{font-size:22px}</style>
    </head><body><h1>Rendición de cobranzas</h1><p>Club La Victoria | ${texto(rendicion.cobrador)}<br>${texto(rendicion.desde)} al ${texto(rendicion.hasta)}</p>
    <table><tr><th>Método de pago</th><th>Importe</th></tr>${metodos}<tr><th>${total}</th><th>${pesos(rendicion.totalVerificadoCentavos)}</th></tr></table>
    <table><tr><th>Fecha</th><th>Socio y conceptos</th><th>Métodos</th><th>Importe recibido</th></tr>${filas}</table></body></html>`;
}
