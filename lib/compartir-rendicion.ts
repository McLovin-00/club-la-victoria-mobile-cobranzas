import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { htmlRendicion, type Rendicion } from "./rendicion-pdf";

export async function compartirRendicion(rendicion: Rendicion): Promise<void> {
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error("Este teléfono no puede compartir el PDF. Guardalo desde la web del club.");
  }
  const archivo = await Print.printToFileAsync({ html: htmlRendicion(rendicion) });
  await Sharing.shareAsync(archivo.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Compartir rendición",
  });
}
