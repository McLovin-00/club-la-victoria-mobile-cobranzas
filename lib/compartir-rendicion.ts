import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  crearDocumentoPdfRendicion,
  htmlRendicion,
  nombreArchivoRendicion,
  type Rendicion,
} from "./rendicion-pdf";

export function puedeCompartirArchivoEnWeb(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") {
    return false;
  }
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };
  if (typeof nav.share !== "function" || typeof File === "undefined") {
    return false;
  }
  if (typeof nav.canShare === "function") {
    try {
      const probe = new File(["%PDF"], "rendicion.pdf", { type: "application/pdf" });
      return nav.canShare({ files: [probe] });
    } catch {
      return false;
    }
  }
  return false;
}

async function escribirPdfNativo(
  rendicion: Rendicion,
  cobradorId: number | string,
): Promise<string> {
  const nombreArchivo = nombreArchivoRendicion(cobradorId, rendicion);
  try {
    const [{ File: ExpoFile, Paths }, doc] = await Promise.all([
      import("expo-file-system"),
      crearDocumentoPdfRendicion(rendicion),
    ]);
    const archivo = new ExpoFile(Paths.cache, nombreArchivo);
    archivo.create({ intermediates: true, overwrite: true });
    archivo.write(new Uint8Array(doc.output("arraybuffer")));
    return archivo.uri;
  } catch {
    const impreso = await Print.printToFileAsync({ html: htmlRendicion(rendicion) });
    return impreso.uri;
  }
}

export async function descargarPdfRendicion(
  rendicion: Rendicion,
  cobradorId: number | string = "cobradora",
): Promise<void> {
  const nombreArchivo = nombreArchivoRendicion(cobradorId, rendicion);

  if (Platform.OS === "web") {
    const doc = await crearDocumentoPdfRendicion(rendicion);
    doc.save(nombreArchivo);
    return;
  }

  await compartirRendicion(rendicion, cobradorId);
}

export async function compartirRendicion(
  rendicion: Rendicion,
  cobradorId: number | string = "cobradora",
): Promise<void> {
  const nombreArchivo = nombreArchivoRendicion(cobradorId, rendicion);

  if (Platform.OS === "web") {
    const doc = await crearDocumentoPdfRendicion(rendicion);
    if (puedeCompartirArchivoEnWeb()) {
      const blob = doc.output("blob");
      const archivoWeb = new File([blob], nombreArchivo, { type: "application/pdf" });
      await navigator.share({
        title: "Rendición de cobranzas",
        files: [archivoWeb],
      });
      return;
    }
    doc.save(nombreArchivo);
    return;
  }

  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error("Este teléfono no puede compartir el PDF. Guardalo desde la web del club.");
  }

  const uri = await escribirPdfNativo(rendicion, cobradorId);
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Compartir o guardar rendición PDF",
  });
}
