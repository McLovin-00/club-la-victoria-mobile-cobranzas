import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Clipboard,
  DollarSign,
  TrendingUp,
  User,
  CreditCard,
  Receipt,
  ChevronRight,
  ChevronLeft,
  Download,
  Share2,
  Search,
  X,
} from "lucide-react-native";
import { ScreenBackButton } from "../../components/ui/screen-back-button";
import { Spinner } from "../../components/ui/spinner";
import { DatePicker } from "../../components/ui/date-picker";
import { Modal } from "../../components/ui/modal";
import { mobileApi } from "../../lib/api";
import { getBinding, setBinding, setEditOperacion, type StoredBinding } from "../../lib/storage";
import {
  compartirRendicion,
  descargarPdfRendicion,
  puedeCompartirArchivoEnWeb,
} from "../../lib/compartir-rendicion";

type OperacionCompleta = NonNullable<
  Awaited<ReturnType<typeof mobileApi.misCobranzas>>["operaciones"][number]
> & {
  totalCargos?: number | string;
  creditoAplicado?: number | string;
  creditoGenerado?: number | string;
  referencia?: string | null;
  observaciones?: string | null;
};

type OperacionSocioCredito = {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  creditoIndividual?: {
    saldo: number | string;
  } | null;
};

interface ReporteData {
  clavePeriodo: string;
  totalCobrado: number;
  total: number;
  totalPeriodo: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  operaciones: OperacionCompleta[];
}

type TipoPeriodo = "mes" | "rango";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 300;
const ZONA_CLUB = "America/Argentina/Buenos_Aires";
const BRAND_PRIMARY = "hsl(146, 68%, 24%)";
const MUTED_FOREGROUND = "hsl(150, 8%, 37%)";
const FOREGROUND = "hsl(150, 15%, 11%)";

const fechaActualDelClub = (): string =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZONA_CLUB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const limitesDelMes = (anio: number, mes: number): { desde: string; hasta: string } => {
  const mesStr = String(mes).padStart(2, "0");
  const ultimoDia = new Date(anio, mes, 0).getDate();
  return {
    desde: `${anio}-${mesStr}-01`,
    hasta: `${anio}-${mesStr}-${String(ultimoDia).padStart(2, "0")}`,
  };
};

const rangoIsoClub = (desdeYmd: string, hastaYmd: string) => ({
  desdeIso: new Date(`${desdeYmd}T00:00:00.000-03:00`).toISOString(),
  hastaIso: new Date(`${hastaYmd}T23:59:59.999-03:00`).toISOString(),
});

const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const formatearMonto = (valor: unknown): string => {
  const monto = aNumero(valor);
  const tieneDecimales = Math.round(monto * 100) % 100 !== 0;
  return monto.toLocaleString("es-AR", {
    minimumFractionDigits: tieneDecimales ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

const capitalizarPrimera = (texto: string): string =>
  texto.length > 0 ? texto[0].toUpperCase() + texto.slice(1) : texto;

const formatearMetodoNombre = (nombre?: string | null): string => {
  const limpio = nombre?.trim();
  if (!limpio) return "Método no informado";
  if (limpio === limpio.toUpperCase() && limpio.length > 2) {
    return limpio[0] + limpio.slice(1).toLowerCase();
  }
  return limpio;
};

export default function MisCobranzasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const hoyInicial = useMemo(() => fechaActualDelClub(), []);
  const mesActualInicial = useMemo(() => {
    const [anio, mes] = hoyInicial.split("-").map(Number);
    return { anio, mes };
  }, [hoyInicial]);

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("mes");
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualInicial);
  const [desdePersonalizado, setDesdePersonalizado] = useState(
    () => `${hoyInicial.slice(0, 7)}-01`,
  );
  const [hastaPersonalizado, setHastaPersonalizado] = useState(hoyInicial);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReporteData | null>(null);
  const [selectedOp, setSelectedOp] = useState<OperacionCompleta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportando, setExportando] = useState<"descargar" | "compartir" | null>(null);

  const requestSeqRef = useRef(0);

  useEffect(() => {
    const limpio = busqueda.trim();
    if (limpio === busquedaDebounced) return;
    if (limpio === "") {
      setBusquedaDebounced("");
      setOffset(0);
      return;
    }
    const timer = setTimeout(() => {
      setBusquedaDebounced(limpio);
      setOffset(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [busqueda, busquedaDebounced]);

  const aplicarBusquedaInmediata = () => {
    const limpio = busqueda.trim();
    if (limpio !== busquedaDebounced) {
      setBusquedaDebounced(limpio);
      setOffset(0);
    }
  };

  const limpiarBusqueda = () => {
    setBusqueda("");
    setBusquedaDebounced("");
    setOffset(0);
  };

  const periodoMesKey = `${mesSeleccionado.anio}-${String(mesSeleccionado.mes).padStart(2, "0")}`;
  const esMesActual =
    mesSeleccionado.anio === mesActualInicial.anio &&
    mesSeleccionado.mes === mesActualInicial.mes;

  const nombreMes = useMemo(() => {
    const raw = new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric",
    }).format(new Date(mesSeleccionado.anio, mesSeleccionado.mes - 1, 1));
    return capitalizarPrimera(raw);
  }, [mesSeleccionado.anio, mesSeleccionado.mes]);

  const rangoActivo = useMemo(() => {
    if (tipoPeriodo === "mes") {
      return limitesDelMes(mesSeleccionado.anio, mesSeleccionado.mes);
    }
    return { desde: desdePersonalizado, hasta: hastaPersonalizado };
  }, [
    tipoPeriodo,
    mesSeleccionado.anio,
    mesSeleccionado.mes,
    desdePersonalizado,
    hastaPersonalizado,
  ]);

  const rangoInvalido =
    tipoPeriodo === "rango" &&
    Boolean(rangoActivo.desde && rangoActivo.hasta && rangoActivo.desde > rangoActivo.hasta);

  const resolverBindingValido = useCallback(async (): Promise<StoredBinding> => {
    const binding = await getBinding();
    if (!binding) {
      throw new Error("Las cobranzas no están listas. Volvé al inicio y reintentá.");
    }

    if (typeof mobileApi.getCobradoresActivos !== "function") {
      return binding;
    }

    try {
      const activos = (await mobileApi.getCobradoresActivos()).filter((c) => c.activo);
      if (activos.length === 0 || activos.some((c) => c.id === binding.cobradorId)) {
        return binding;
      }

      const nombreBuscado = binding.cobradorNombre?.trim().toLowerCase();
      const coincidencia =
        (nombreBuscado
          ? activos.find((c) => c.nombre.trim().toLowerCase() === nombreBuscado)
          : undefined) ?? activos[0];

      if (!coincidencia) {
        return binding;
      }

      if (typeof mobileApi.vincularDispositivo === "function" && binding.installationId) {
        await mobileApi.vincularDispositivo({
          installationId: binding.installationId,
          cobradorId: coincidencia.id,
        });
      }

      const actualizado: StoredBinding = {
        installationId: binding.installationId,
        cobradorId: coincidencia.id,
        cobradorNombre: coincidencia.nombre,
      };
      if (typeof setBinding === "function") {
        await setBinding(actualizado);
      }
      return actualizado;
    } catch {
      return binding;
    }
  }, []);

  const cargarCobranzas = useCallback(
    async (desdeYmd: string, hastaYmd: string, query: string, pageOffset: number) => {
      const requestId = ++requestSeqRef.current;
      setError(null);
      setLoading(true);
      try {
        const binding = await resolverBindingValido();
        const { desdeIso, hastaIso } = rangoIsoClub(desdeYmd, hastaYmd);
        const result = await mobileApi.misCobranzas(binding.cobradorId, desdeIso, hastaIso, {
          q: query || undefined,
          offset: pageOffset,
          limit: PAGE_SIZE,
        });
        if (requestId !== requestSeqRef.current) return;

        const operaciones = result.operaciones ?? [];
        const total = result.total ?? operaciones.length;
        const totalPeriodo = result.totalPeriodo ?? total;
        const currentOffset = result.offset ?? pageOffset;
        const currentLimit = result.limit ?? PAGE_SIZE;
        const hasMore =
          result.hasMore ?? (total > operaciones.length && currentOffset + operaciones.length < total);

        setData({
          clavePeriodo: `${desdeYmd}_${hastaYmd}`,
          totalCobrado: aNumero(result.totalCobrado),
          total,
          totalPeriodo,
          offset: currentOffset,
          limit: currentLimit,
          hasMore,
          operaciones,
        });
      } catch (err) {
        if (requestId !== requestSeqRef.current) return;
        setError(err instanceof Error ? err.message : "Error consultando cobranzas");
      } finally {
        if (requestId === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [resolverBindingValido],
  );

  useEffect(() => {
    if (rangoInvalido) {
      setError("La fecha inicial no puede ser posterior a la final.");
      setLoading(false);
      return;
    }
    void cargarCobranzas(rangoActivo.desde, rangoActivo.hasta, busquedaDebounced, offset);
  }, [cargarCobranzas, rangoActivo.desde, rangoActivo.hasta, busquedaDebounced, offset, rangoInvalido]);

  const cambiarMes = (delta: number) => {
    setOffset(0);
    setMesSeleccionado((actual) => {
      const fecha = new Date(actual.anio, actual.mes - 1 + delta, 1);
      return { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 };
    });
  };

  const cambiarTipoPeriodo = (nuevoTipo: TipoPeriodo) => {
    if (nuevoTipo === tipoPeriodo) return;
    setOffset(0);
    if (nuevoTipo === "rango") {
      const limites = limitesDelMes(mesSeleccionado.anio, mesSeleccionado.mes);
      const hastaSugerido =
        esMesActual && hoyInicial >= limites.desde && hoyInicial <= limites.hasta
          ? hoyInicial
          : limites.hasta;
      setDesdePersonalizado(limites.desde);
      setHastaPersonalizado(hastaSugerido);
    }
    setTipoPeriodo(nuevoTipo);
  };

  const handleCambiarDesde = (nuevoDesde: string) => {
    setOffset(0);
    setDesdePersonalizado(nuevoDesde);
  };

  const handleCambiarHasta = (nuevoHasta: string) => {
    setOffset(0);
    setHastaPersonalizado(nuevoHasta);
  };

  const obtenerRendicionPeriodoActual = async () => {
    if (rangoInvalido) {
      throw new Error("La fecha inicial no puede ser posterior a la final.");
    }
    const binding = await resolverBindingValido();
    if (!binding?.installationId) {
      throw new Error("Las cobranzas no están listas. Volvé al inicio y reintentá.");
    }
    const consulta =
      tipoPeriodo === "mes"
        ? { periodo: periodoMesKey }
        : { desde: rangoActivo.desde, hasta: rangoActivo.hasta };

    try {
      const rendicion = await mobileApi.rendicion(binding.installationId, consulta);
      return { rendicion, cobradorId: binding.cobradorId };
    } catch (err) {
      if (
        err instanceof Error &&
        /no autorizado/i.test(err.message) &&
        typeof mobileApi.vincularDispositivo === "function"
      ) {
        await mobileApi.vincularDispositivo({
          installationId: binding.installationId,
          cobradorId: binding.cobradorId,
        });
        const rendicion = await mobileApi.rendicion(binding.installationId, consulta);
        return { rendicion, cobradorId: binding.cobradorId };
      }
      throw err;
    }
  };

  const handleExportarPdf = async (modo: "descargar" | "compartir") => {
    const claveActual = `${rangoActivo.desde}_${rangoActivo.hasta}`;
    const periodoTieneCobranzas =
      data?.clavePeriodo === claveActual && (data?.totalPeriodo ?? 0) > 0;
    if (exportando || rangoInvalido || !periodoTieneCobranzas) return;
    setError(null);
    setExportando(modo);
    try {
      const { rendicion, cobradorId } = await obtenerRendicionPeriodoActual();
      if (modo === "descargar") {
        await descargarPdfRendicion(rendicion, cobradorId);
      } else {
        await compartirRendicion(rendicion, cobradorId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar la rendición en PDF");
    } finally {
      setExportando(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const todayYmd = fechaActualDelClub();
    const dateYmd = new Intl.DateTimeFormat("sv-SE", {
      timeZone: ZONA_CLUB,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

    const [ty, tm, td] = todayYmd.split("-").map(Number);
    const yesterday = new Date(Date.UTC(ty, tm - 1, td - 1)).toISOString().slice(0, 10);

    if (dateYmd === todayYmd) {
      return "Hoy";
    }
    if (dateYmd === yesterday) {
      return "Ayer";
    }
    return date.toLocaleDateString("es-AR", {
      timeZone: ZONA_CLUB,
      day: "numeric",
      month: "short",
      year: dateYmd.slice(0, 4) !== todayYmd.slice(0, 4) ? "numeric" : undefined,
    });
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("es-AR", {
      timeZone: ZONA_CLUB,
      hour: "2-digit",
      minute: "2-digit",
    });

  const getLineaTitle = (linea: OperacionCompleta["lineas"][number], idx: number) => {
    if (linea.tipoLinea === "CUOTA") {
      if (linea.cuota?.periodo) return `Cuota ${linea.cuota.periodo}`;
      if (linea.cuotaId) return `Cuota #${linea.cuotaId}`;
      return "Cuota";
    }
    if (linea.tipoLinea === "CONCEPTO") {
      return linea.concepto?.trim() || "Concepto";
    }
    return `Ítem #${idx + 1}`;
  };

  const getLineaSubtitle = (linea: OperacionCompleta["lineas"][number]) => {
    if (linea.tipoLinea === "CONCEPTO") {
      return linea.descripcion?.trim() || null;
    }
    if (linea.tipoLinea === "CUOTA") {
      return linea.descripcion?.trim() || "Cobro de cuota";
    }
    return null;
  };

  const getOperacionSocio = (op: OperacionCompleta) => {
    if (!op.socio) return "Socio no informado";
    return `${op.socio.nombre} ${op.socio.apellido}`.trim();
  };

  const getOperacionMetodo = (op: OperacionCompleta) =>
    formatearMetodoNombre(op.metodoPago?.nombre);

  const getOperacionItems = (op: OperacionCompleta) => {
    const cantidad = op.lineas?.length ?? 0;
    return `${cantidad} ${cantidad === 1 ? "ítem" : "ítems"}`;
  };

  const getOperacionResumen = (op: OperacionCompleta) =>
    `${getOperacionSocio(op)} • ${getOperacionMetodo(op)} • ${getOperacionItems(op)}`;

  const getCreditoIndividualSaldo = (socio: OperacionCompleta["socio"]) => {
    const saldo = (socio as OperacionSocioCredito | null | undefined)?.creditoIndividual?.saldo;
    return aNumero(saldo);
  };

  const openDetail = (op: OperacionCompleta) => {
    setSelectedOp(op);
    setModalVisible(true);
  };

  const closeDetail = () => {
    setModalVisible(false);
    setSelectedOp(null);
  };

  const esWeb = Platform.OS === "web";
  const mostrarCompartirWeb = esWeb && puedeCompartirArchivoEnWeb();
  const clavePeriodoActual = `${rangoActivo.desde}_${rangoActivo.hasta}`;
  const datosDelPeriodoActual = data?.clavePeriodo === clavePeriodoActual;
  const tieneCobranzasPeriodo = datosDelPeriodoActual && (data?.totalPeriodo ?? 0) > 0;
  const deshabilitarPdf = Boolean(exportando) || rangoInvalido || !tieneCobranzasPeriodo;
  const totalOperaciones = data?.total ?? 0;
  const tienePaginacion = totalOperaciones > PAGE_SIZE;
  const paginaActual = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPaginas = Math.max(1, Math.ceil(totalOperaciones / PAGE_SIZE));
  const tienePaginaAnterior = offset > 0;
  const tienePaginaSiguiente = Boolean(data?.hasMore);

  const desdeItem = totalOperaciones === 0 ? 0 : offset + 1;
  const hastaItem = offset + (data?.operaciones.length ?? 0);
  const etiquetaCantidad = tienePaginacion
    ? `${desdeItem}–${hastaItem} de ${totalOperaciones}`
    : totalOperaciones === 1
      ? "1 operación"
      : `${totalOperaciones} operaciones`;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Hero Header */}
        <View
          className="bg-primary px-6 rounded-b-[32px] md:rounded-b-none"
          style={{ paddingTop: Math.max(insets.top + 20, 36), paddingBottom: 56 }}
        >
          <View className="w-full max-w-lg mx-auto">
            <View className="flex-row items-center gap-3 mb-4">
              <ScreenBackButton onPress={() => router.back()} tone="light" />
              <View className="flex-1" />
            </View>

            <View accessibilityRole="header" className="gap-1">
              <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
                Mis Cobranzas
              </Text>
              <Text className="text-primary-foreground/90 text-sm">
                Cobros registrados y rendición en PDF
              </Text>
            </View>
          </View>
        </View>

        {/* Selector unificado de período + exportación PDF */}
        <View className="-mt-8 px-6 z-10">
          <View className="w-full max-w-lg mx-auto bg-card rounded-3xl p-4 shadow-elevated border border-border gap-4">
            {/* Selector de modo: Por mes vs Personalizado */}
            <View
              className="flex-row bg-muted p-1 rounded-2xl"
              accessibilityRole="tablist"
              accessibilityLabel="Tipo de período"
            >
              <Pressable
                onPress={() => cambiarTipoPeriodo("mes")}
                accessibilityRole="tab"
                accessibilityLabel="Mes completo"
                accessibilityState={{ selected: tipoPeriodo === "mes" }}
                className={`flex-1 min-h-10 py-2 rounded-xl items-center justify-center px-3 ${
                  tipoPeriodo === "mes" ? "bg-card shadow-sm" : ""
                }`}
              >
                <Text
                  className={`text-sm font-semibold text-center ${
                    tipoPeriodo === "mes" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Por mes
                </Text>
              </Pressable>
              <Pressable
                onPress={() => cambiarTipoPeriodo("rango")}
                accessibilityRole="tab"
                accessibilityLabel="Rango personalizado"
                accessibilityState={{ selected: tipoPeriodo === "rango" }}
                className={`flex-1 min-h-10 py-2 rounded-xl items-center justify-center px-3 ${
                  tipoPeriodo === "rango" ? "bg-card shadow-sm" : ""
                }`}
              >
                <Text
                  className={`text-sm font-semibold text-center ${
                    tipoPeriodo === "rango" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Personalizado
                </Text>
              </Pressable>
            </View>

            {/* Controles del período activo */}
            {tipoPeriodo === "mes" ? (
              <View className="gap-2">
                <View className="flex-row items-center justify-between gap-2">
                  <Pressable
                    onPress={() => cambiarMes(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Mes anterior"
                    className="min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-background active:bg-muted"
                  >
                    <ChevronLeft size={18} color={FOREGROUND} />
                  </Pressable>

                  <View className="flex-1 items-center gap-0.5">
                    <Text
                      className="text-foreground text-base font-bold text-center"
                      accessibilityRole="header"
                    >
                      {nombreMes}
                    </Text>
                    {esMesActual ? (
                      <Text className="text-primary text-xs font-medium">Mes actual</Text>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setOffset(0);
                          setMesSeleccionado(mesActualInicial);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Volver al mes actual"
                        className="px-2.5 py-0.5 rounded-full bg-primary/10 active:opacity-80"
                      >
                        <Text className="text-primary text-xs font-semibold">
                          Ir a este mes
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <Pressable
                    onPress={() => cambiarMes(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Mes siguiente"
                    className="min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-background active:bg-muted"
                  >
                    <ChevronRight size={18} color={FOREGROUND} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Text className="text-muted-foreground text-xs font-semibold">Desde</Text>
                  <DatePicker
                    value={desdePersonalizado}
                    onChange={handleCambiarDesde}
                    placeholder="DD-MM-AAAA"
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Text className="text-muted-foreground text-xs font-semibold">Hasta</Text>
                  <DatePicker
                    value={hastaPersonalizado}
                    onChange={handleCambiarHasta}
                    placeholder="DD-MM-AAAA"
                  />
                </View>
              </View>
            )}

            {/* Exportación de PDF (mismo PDF que el frontend web) */}
            <View className="gap-2 pt-1 border-t border-border/60">
              <View className="flex-row gap-2.5">
                {esWeb ? (
                  <>
                    <Pressable
                      onPress={() => void handleExportarPdf("descargar")}
                      disabled={deshabilitarPdf}
                      accessibilityRole="button"
                      accessibilityLabel="Descargar PDF"
                      accessibilityHint="Descarga el PDF de rendición del período seleccionado"
                      accessibilityState={{ disabled: deshabilitarPdf }}
                      className={`flex-1 min-h-12 rounded-2xl px-4 items-center justify-center bg-primary ${
                        deshabilitarPdf ? "opacity-45" : "active:opacity-90"
                      }`}
                    >
                      {exportando === "descargar" ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <View className="flex-row items-center gap-2">
                          <Download size={18} color="#ffffff" />
                          <Text className="text-primary-foreground font-bold text-sm">
                            Descargar PDF
                          </Text>
                        </View>
                      )}
                    </Pressable>

                    {mostrarCompartirWeb && (
                      <Pressable
                        onPress={() => void handleExportarPdf("compartir")}
                        disabled={deshabilitarPdf}
                        accessibilityRole="button"
                        accessibilityLabel="Compartir PDF"
                        accessibilityHint="Envía el PDF por WhatsApp u otra aplicación"
                        accessibilityState={{ disabled: deshabilitarPdf }}
                        className={`min-h-12 px-4 rounded-2xl items-center justify-center border border-primary bg-background ${
                          deshabilitarPdf ? "opacity-45" : "active:bg-primary/10"
                        }`}
                      >
                        {exportando === "compartir" ? (
                          <ActivityIndicator color={BRAND_PRIMARY} />
                        ) : (
                          <View className="flex-row items-center gap-2">
                            <Share2 size={18} color={BRAND_PRIMARY} />
                            <Text className="text-primary font-bold text-sm">Compartir</Text>
                          </View>
                        )}
                      </Pressable>
                    )}
                  </>
                ) : (
                  <Pressable
                    onPress={() => void handleExportarPdf("compartir")}
                    disabled={deshabilitarPdf}
                    accessibilityRole="button"
                    accessibilityLabel="Compartir PDF"
                    accessibilityHint="Abre las opciones para guardar el PDF o enviarlo por WhatsApp"
                    accessibilityState={{ disabled: deshabilitarPdf }}
                    className={`flex-1 min-h-12 rounded-2xl px-4 items-center justify-center bg-primary ${
                      deshabilitarPdf ? "opacity-45" : "active:opacity-90"
                    }`}
                  >
                    {exportando === "compartir" ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <View className="flex-row items-center gap-2">
                        <Share2 size={18} color="#ffffff" />
                        <Text className="text-primary-foreground font-bold text-sm">
                          Exportar / Enviar PDF
                        </Text>
                      </View>
                    )}
                  </Pressable>
                )}
              </View>

              {!loading && datosDelPeriodoActual && !rangoInvalido && !tieneCobranzasPeriodo && (
                <Text className="text-muted-foreground text-xs text-center">
                  El PDF se habilita cuando hay cobranzas en el período seleccionado.
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Área de búsqueda, resumen y resultados */}
        <View className="px-6 pt-5 pb-6">
          <View className="w-full max-w-lg mx-auto gap-4">
            {/* Buscador */}
            <View
              className="bg-card rounded-2xl px-3.5 min-h-12 flex-row items-center border border-border focus-within:border-primary shadow-card gap-2.5"
              accessibilityRole="search"
            >
              <View accessibilityElementsHidden aria-hidden>
                <Search size={18} color={MUTED_FOREGROUND} />
              </View>
              <TextInput
                className="flex-1 text-sm font-medium text-foreground py-2.5 outline-none"
                style={Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : undefined}
                placeholder="Buscar por socio, DNI, método o #cobro..."
                placeholderTextColor={MUTED_FOREGROUND}
                value={busqueda}
                onChangeText={setBusqueda}
                returnKeyType="search"
                onSubmitEditing={aplicarBusquedaInmediata}
                accessibilityLabel="Buscar en mis cobranzas"
              />
              {busqueda.length > 0 && (
                <Pressable
                  onPress={limpiarBusqueda}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                  className="w-8 h-8 rounded-full bg-muted items-center justify-center active:opacity-80"
                >
                  <X size={15} color={FOREGROUND} />
                </Pressable>
              )}
            </View>

            {/* Error */}
            {error && (
              <View
                className="bg-destructive/10 border border-destructive/25 rounded-2xl p-4 flex-row items-center justify-between gap-3"
                accessibilityRole="alert"
              >
                <Text className="text-destructive font-medium text-sm flex-1">{error}</Text>
                {!rangoInvalido && (
                  <Pressable
                    onPress={() =>
                      void cargarCobranzas(
                        rangoActivo.desde,
                        rangoActivo.hasta,
                        busquedaDebounced,
                        offset,
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Reintentar consulta"
                    className="px-3 py-1.5 rounded-xl border border-destructive/30 bg-card"
                  >
                    <Text className="text-destructive text-xs font-semibold">Reintentar</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Total del período / búsqueda */}
            {data && !loading && !rangoInvalido && (
              <View
                className="bg-card rounded-3xl p-5 border border-border shadow-card"
                accessibilityRole="summary"
                accessibilityLabel={`Total cobrado en el período: $${formatearMonto(data.totalCobrado)}`}
              >
                <View className="flex-row items-center gap-4">
                  <View
                    className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center border border-primary/20"
                    accessibilityElementsHidden
                    aria-hidden
                  >
                    <DollarSign size={24} color={BRAND_PRIMARY} />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-muted-foreground text-xs font-semibold">
                      {busquedaDebounced
                        ? "Total cobrado en la búsqueda"
                        : "Total cobrado en el período"}
                    </Text>
                    <Text
                      className="text-foreground font-bold text-3xl tracking-tight"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      ${formatearMonto(data.totalCobrado)}
                    </Text>
                  </View>
                  <View accessibilityElementsHidden aria-hidden>
                    <TrendingUp size={22} color={BRAND_PRIMARY} />
                  </View>
                </View>
              </View>
            )}

            {/* Estado de carga */}
            {loading && (
              <View
                className="items-center py-10"
                accessibilityRole="progressbar"
                accessibilityLabel="Cargando cobranzas"
              >
                <Spinner size="lg" />
                <Text className="text-muted-foreground mt-3 text-sm">
                  Cargando cobranzas...
                </Text>
              </View>
            )}

            {/* Encabezado de operaciones */}
            {data && !loading && !rangoInvalido && data.operaciones.length > 0 && (
              <View
                className="flex-row items-center justify-between pt-1"
                accessibilityRole="header"
              >
                <Text className="text-foreground text-lg font-bold tracking-tight">
                  Cobranzas registradas
                </Text>
                <View
                  className="bg-secondary px-3 py-1 rounded-full"
                  accessibilityLabel={etiquetaCantidad}
                >
                  <Text
                    className="text-secondary-foreground font-semibold text-xs"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {etiquetaCantidad}
                  </Text>
                </View>
              </View>
            )}

            {/* Lista paginada de cobranzas */}
            {data && !loading && !rangoInvalido && data.operaciones.length > 0 && (
              <View className="gap-3">
                {data.operaciones.map((op) => {
                  const montoFormateado = formatearMonto(op.total);
                  return (
                    <Pressable
                      key={op.id}
                      className="bg-card rounded-3xl p-4 border border-border shadow-card flex-row items-center gap-3.5 active:opacity-85"
                      onPress={() => openDetail(op)}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatDate(op.fechaHoraServidor)} a las ${formatTime(op.fechaHoraServidor)}, operación número ${op.id}, ${getOperacionResumen(op)}, monto $${montoFormateado}. Toca para ver detalle.`}
                    >
                      <View
                        className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center border border-primary/20 shrink-0"
                        accessibilityElementsHidden
                        aria-hidden
                      >
                        <DollarSign size={20} color={BRAND_PRIMARY} />
                      </View>

                      <View className="flex-1 min-w-0 justify-center gap-1">
                        <Text
                          className="text-foreground font-bold text-base leading-tight"
                          numberOfLines={1}
                        >
                          {getOperacionSocio(op)}
                        </Text>
                        <View
                          className="flex-row items-center gap-1.5 flex-wrap"
                          accessibilityElementsHidden
                          aria-hidden
                        >
                          <Text
                            className="text-muted-foreground text-xs font-medium"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {formatDate(op.fechaHoraServidor)} · {formatTime(op.fechaHoraServidor)}
                          </Text>
                          <Text className="text-muted-foreground text-xs">•</Text>
                          <Text
                            className="text-muted-foreground text-xs font-medium"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            Op #{op.id}
                          </Text>
                        </View>
                        <View
                          className="flex-row items-center gap-1.5"
                          accessibilityElementsHidden
                          aria-hidden
                        >
                          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                            {getOperacionMetodo(op)}
                          </Text>
                          <Text className="text-muted-foreground text-xs">•</Text>
                          <Text className="text-muted-foreground text-xs font-medium">
                            {getOperacionItems(op)}
                          </Text>
                        </View>
                      </View>

                      <View className="bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shrink-0">
                        <Text
                          className="text-primary text-sm font-bold"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          ${montoFormateado}
                        </Text>
                      </View>

                      <View accessibilityElementsHidden aria-hidden>
                        <ChevronRight size={18} color={MUTED_FOREGROUND} />
                      </View>
                    </Pressable>
                  );
                })}

                {/* Controles de paginación */}
                {tienePaginacion && (
                  <View className="flex-row items-center justify-between pt-2 gap-3">
                    <Pressable
                      onPress={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                      disabled={!tienePaginaAnterior || loading}
                      accessibilityRole="button"
                      accessibilityLabel="Página anterior"
                      accessibilityState={{ disabled: !tienePaginaAnterior || loading }}
                      className={`min-h-11 px-4 rounded-2xl border border-border bg-card flex-row items-center gap-1.5 ${
                        !tienePaginaAnterior || loading ? "opacity-45" : "active:bg-muted"
                      }`}
                    >
                      <ChevronLeft size={16} color={FOREGROUND} />
                      <Text className="text-foreground text-sm font-semibold">Anterior</Text>
                    </Pressable>

                    <Text
                      className="text-muted-foreground text-xs font-semibold"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      Página {paginaActual} de {totalPaginas}
                    </Text>

                    <Pressable
                      onPress={() => setOffset((prev) => prev + PAGE_SIZE)}
                      disabled={!tienePaginaSiguiente || loading}
                      accessibilityRole="button"
                      accessibilityLabel="Página siguiente"
                      accessibilityState={{ disabled: !tienePaginaSiguiente || loading }}
                      className={`min-h-11 px-4 rounded-2xl border border-border bg-card flex-row items-center gap-1.5 ${
                        !tienePaginaSiguiente || loading ? "opacity-45" : "active:bg-muted"
                      }`}
                    >
                      <Text className="text-foreground text-sm font-semibold">Siguiente</Text>
                      <ChevronRight size={16} color={FOREGROUND} />
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Estado vacío */}
            {data && !loading && !rangoInvalido && data.operaciones.length === 0 && (
              <View
                className="items-center justify-center py-10 px-5 bg-card rounded-3xl border border-border/60 gap-2"
                accessibilityRole="text"
                accessibilityLabel="Sin cobranzas en el período"
              >
                <View className="mb-1 opacity-50" accessibilityElementsHidden aria-hidden>
                  <Clipboard size={42} color={MUTED_FOREGROUND} />
                </View>
                {busquedaDebounced ? (
                  <>
                    <Text className="text-foreground font-bold text-base text-center">
                      Sin resultados para «{busquedaDebounced}»
                    </Text>
                    <Text className="text-muted-foreground text-sm text-center">
                      No encontramos cobros que coincidan con esa búsqueda en el período elegido.
                    </Text>
                    <Pressable
                      onPress={limpiarBusqueda}
                      accessibilityRole="button"
                      accessibilityLabel="Limpiar filtro de búsqueda"
                      className="mt-2 min-h-10 px-4 rounded-xl bg-primary/10 border border-primary/25 items-center justify-center active:opacity-80"
                    >
                      <Text className="text-primary text-sm font-semibold">Limpiar búsqueda</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text className="text-foreground font-bold text-base text-center">
                      Sin cobranzas registradas
                    </Text>
                    <Text className="text-muted-foreground text-sm text-center">
                      No se registraron cobros en{" "}
                      {tipoPeriodo === "mes" ? nombreMes.toLowerCase() : "el rango seleccionado"}.
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal de detalle de cobranza */}
      <Modal
        visible={modalVisible}
        onClose={closeDetail}
        title={selectedOp ? `Cobro #${selectedOp.id}` : "Detalle del cobro"}
      >
        {selectedOp && (
          <View className="gap-4">
            {/* Resumen principal: fecha/hora y monto */}
            <View className="flex-row items-center justify-between p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <View className="gap-0.5">
                <Text
                  className="text-muted-foreground text-xs font-semibold"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {formatDate(selectedOp.fechaHoraServidor)} ·{" "}
                  {formatTime(selectedOp.fechaHoraServidor)}
                </Text>
                <Text
                  className="text-foreground font-bold text-2xl tracking-tight"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  ${formatearMonto(selectedOp.total)}
                </Text>
              </View>
              <View
                className="w-11 h-11 rounded-2xl bg-card items-center justify-center border border-primary/20"
                accessibilityElementsHidden
                aria-hidden
              >
                <DollarSign size={22} color={BRAND_PRIMARY} />
              </View>
            </View>

            {/* Socio y método de pago */}
            <View className="gap-2.5">
              {selectedOp.socio && (
                <View className="flex-row items-center gap-3 p-3.5 bg-muted/60 rounded-2xl border border-border/60">
                  <View
                    className="w-10 h-10 rounded-xl bg-card items-center justify-center border border-border/60"
                    accessibilityElementsHidden
                    aria-hidden
                  >
                    <User size={18} color={BRAND_PRIMARY} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-muted-foreground text-xs font-medium">Socio</Text>
                    <Text className="text-foreground font-semibold text-base" numberOfLines={1}>
                      {selectedOp.socio.nombre} {selectedOp.socio.apellido}
                    </Text>
                    {(selectedOp.socio as OperacionSocioCredito).dni ? (
                      <Text
                        className="text-muted-foreground text-xs"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        DNI {(selectedOp.socio as OperacionSocioCredito).dni}
                      </Text>
                    ) : null}
                  </View>
                  {getCreditoIndividualSaldo(selectedOp.socio) > 0 && (
                    <View className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1">
                      <Text
                        className="text-primary text-xs font-semibold"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        Saldo: ${formatearMonto(getCreditoIndividualSaldo(selectedOp.socio))}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {selectedOp.metodoPago && (
                <View className="flex-row items-center gap-3 p-3.5 bg-muted/60 rounded-2xl border border-border/60">
                  <View
                    className="w-10 h-10 rounded-xl bg-card items-center justify-center border border-border/60"
                    accessibilityElementsHidden
                    aria-hidden
                  >
                    <CreditCard size={18} color={BRAND_PRIMARY} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-muted-foreground text-xs font-medium">
                      Método de pago
                    </Text>
                    <Text className="text-foreground font-semibold text-base">
                      {formatearMetodoNombre(selectedOp.metodoPago.nombre)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Desglose de conceptos y cuotas */}
            {selectedOp.lineas && selectedOp.lineas.length > 0 ? (
              <View className="gap-2.5">
                <View className="flex-row items-center gap-2 pt-1">
                  <View accessibilityElementsHidden aria-hidden>
                    <Receipt size={16} color={MUTED_FOREGROUND} />
                  </View>
                  <Text className="text-foreground text-sm font-bold">
                    Conceptos cobrados ({selectedOp.lineas.length}{" "}
                    {selectedOp.lineas.length === 1 ? "ítem" : "ítems"})
                  </Text>
                </View>

                <View className="rounded-2xl border border-border bg-background overflow-hidden">
                  {selectedOp.lineas.map((linea, idx) => {
                    const lineaTitle = getLineaTitle(linea, idx);
                    const lineaSubtitle = getLineaSubtitle(linea);
                    const isLast = idx === selectedOp.lineas.length - 1;

                    return (
                      <View
                        key={linea.id || idx}
                        className={`flex-row items-center justify-between px-4 py-3 gap-3 ${
                          !isLast ? "border-b border-border/60" : ""
                        }`}
                      >
                        <View className="flex-1 min-w-0">
                          <Text className="text-foreground font-semibold text-sm">
                            {lineaTitle}
                          </Text>
                          {lineaSubtitle && (
                            <Text className="text-muted-foreground text-xs mt-0.5">
                              {lineaSubtitle}
                            </Text>
                          )}
                        </View>
                        <Text
                          className="text-foreground font-bold text-sm shrink-0"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          ${formatearMonto(linea.monto)}
                        </Text>
                      </View>
                    );
                  })}

                  {aNumero(selectedOp.creditoAplicado) > 0 && (
                    <View className="flex-row items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/40">
                      <Text className="text-muted-foreground text-xs font-medium">
                        Saldo a favor aplicado
                      </Text>
                      <Text
                        className="text-foreground text-xs font-semibold"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        -${formatearMonto(selectedOp.creditoAplicado)}
                      </Text>
                    </View>
                  )}

                  {aNumero(selectedOp.creditoGenerado) > 0 && (
                    <View className="flex-row items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/40">
                      <Text className="text-muted-foreground text-xs font-medium">
                        Saldo a favor generado
                      </Text>
                      <Text
                        className="text-primary text-xs font-semibold"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        +${formatearMonto(selectedOp.creditoGenerado)}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center justify-between px-4 py-3 border-t border-border bg-muted/60">
                    <Text className="text-foreground text-sm font-bold">Total cobrado</Text>
                    <Text
                      className="text-primary font-bold text-lg"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      ${formatearMonto(selectedOp.total)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="items-center py-6 rounded-2xl bg-muted/40 border border-border/60">
                <Text className="text-muted-foreground text-sm">
                  Sin detalle de conceptos disponible
                </Text>
              </View>
            )}

            {/* Acción de edición */}
            {!selectedOp.socio ? (
              <View className="bg-muted rounded-2xl p-4 items-center mt-1">
                <Text className="text-muted-foreground text-sm text-center">
                  Esta operación no tiene socio individual asociado y no puede editarse desde acá.
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={async () => {
                  await setEditOperacion(selectedOp);
                  closeDetail();
                  router.push({
                    pathname: "/cobradora/pago",
                    params: {
                      socioId: selectedOp.socio!.id.toString(),
                      nombre: encodeURIComponent(selectedOp.socio!.nombre),
                      apellido: encodeURIComponent(selectedOp.socio!.apellido),
                      operacionId: selectedOp.id.toString(),
                      creditoDisponible: encodeURIComponent(
                        String(getCreditoIndividualSaldo(selectedOp.socio)),
                      ),
                    },
                  });
                }}
                className="bg-primary min-h-12 rounded-2xl px-4 py-3.5 items-center justify-center mt-1 active:opacity-90"
                accessibilityRole="button"
                accessibilityLabel="Editar operación"
              >
                <Text className="text-primary-foreground font-bold text-base">
                  Editar operación
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </Modal>
    </View>
  );
}
