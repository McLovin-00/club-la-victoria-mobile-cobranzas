export const METODOS_PAGO = [
  { id: 1, nombre: "Efectivo" },
  { id: 2, nombre: "Transferencia" },
] as const;

export const toCents = (value: number): number => Math.round(value * 100);

const normalizeMontoInput = (value: string): string => {
  const sanitized = value.replace(/[^0-9.,-]/g, "").trim();
  if (!sanitized) return "0";

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    return sanitized
      .replace(new RegExp(`\\${thousandsSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  }

  if (lastComma >= 0) {
    return sanitized.replace(/\./g, "").replace(",", ".");
  }

  if (lastDot >= 0) {
    const parts = sanitized.split(".");
    const isThousandsFormat =
      parts.length > 1 &&
      parts.slice(1).every((part) => part.length === 3) &&
      parts[0].length <= 3;

    return isThousandsFormat ? parts.join("") : sanitized;
  }

  return sanitized;
};

export const parseMontoInputToCents = (value: string): number => {
  const normalized = normalizeMontoInput(value);
  if (normalized.startsWith("-")) {
    return 0;
  }
  const parsed = Number(normalized || 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return toCents(parsed);
};

export const parseMontoInputToAmount = (value: string): number => parseMontoInputToCents(value) / 100;
