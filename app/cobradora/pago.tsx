import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  CalendarPlus,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Plus,
  PlusCircle,
  Wallet,
  X,
} from "lucide-react-native";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";
import { ScreenBackButton } from "../../components/ui/screen-back-button";
import { useToast } from "../../components/ui/toast";
import { mobileApi } from "../../lib/api";
import type { SocioConGrupo } from "../../lib/types";
import { METODOS_PAGO, parseMontoInputToAmount, parseMontoInputToCents, toCents } from "../../lib/pagos";
import { getBinding, getEditOperacion, clearEditOperacion } from "../../lib/storage";
import { cn } from "../../lib/utils";

interface CuotaItem {
  id: number;
  periodo: string;
  monto: number;
}

interface ConceptoAdicionalForm {
  id: string;
  concepto: string;
  monto: string;
}

interface ResumenCobroConfirmado {
  socio: string | null;
  detalle: string;
  metodo: string;
  totalCobrado: number;
  creditoAplicado: number;
  saldoGenerado: number;
}

const MAX_PERIODOS_COBRO = 120;
const MIN_ANIO_ADELANTO = 2000;
const MAX_ANIO_ADELANTO = 2100;
const mesesDelAnio = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const mesAnio = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const pesos = (monto: number) => `$${monto.toLocaleString("es-AR")}`;
const MENSAJE_NETO_DESACTUALIZADO = "El importe del cobro cambió. Revisá el total actualizado y confirmá nuevamente.";

function esConflictoDeImporte(error: Error): boolean {
  if (error.message === "El saldo a favor cambió; revisá el resumen antes de cobrar") return true;
  try {
    const detalle = JSON.parse(error.message);
    return detalle?.statusCode === 409 && detalle?.message === MENSAJE_NETO_DESACTUALIZADO;
  } catch {
    return false;
  }
}
const indicePeriodo = (periodo: string) => Number(periodo.slice(0, 4)) * 12 + Number(periodo.slice(5));
const capitalizar = (texto: string) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto);

function nombrePeriodo(periodo: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(periodo);
  if (!match) return periodo;
  return capitalizar(mesAnio.format(new Date(Number(match[1]), Number(match[2]) - 1, 1)).replace(" de ", " "));
}

function resumirPeriodos(periodos: string[]) {
  const grupos: string[][] = [];
  for (const periodo of periodos) {
    const grupo = grupos[grupos.length - 1];
    const anterior = grupo?.[grupo.length - 1];
    if (anterior && indicePeriodo(periodo) === indicePeriodo(anterior) + 1) grupo.push(periodo);
    else grupos.push([periodo]);
  }
  return grupos
    .map((grupo) =>
      grupo.length === 1
        ? nombrePeriodo(grupo[0])
        : `${nombrePeriodo(grupo[0])} a ${nombrePeriodo(grupo[grupo.length - 1])}`,
    )
    .join(", ");
}

export default function PagoCobradoraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{
    socioId?: string;
    fromGrupo?: string;
    nombre?: string;
    apellido?: string;
    creditoDisponible?: string;
    operacionId?: string;
  }>();
  const socioId = Number(params.socioId ?? 0);
  const fromGrupo = params.fromGrupo ? Number(params.fromGrupo) : null;
  const socioNombre = params.nombre ? decodeURIComponent(params.nombre) : null;
  const socioApellido = params.apellido ? decodeURIComponent(params.apellido) : null;
  const creditoInicial = params.creditoDisponible
    ? Number(decodeURIComponent(params.creditoDisponible)) || 0
    : 0;
  const editingOperacionId = params.operacionId ? Number(params.operacionId) : null;
  const isEditMode = editingOperacionId !== null;

  const [cuotas, setCuotas] = useState<CuotaItem[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [conceptos, setConceptos] = useState<ConceptoAdicionalForm[]>([
    { id: "concepto-0", concepto: "", monto: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [socioInfo, setSocioInfo] = useState<SocioConGrupo | null>(null);
  const [creditoDisponible, setCreditoDisponible] = useState(creditoInicial);
  const [loadingCuotas, setLoadingCuotas] = useState(true);
  const [cuotasCargadas, setCuotasCargadas] = useState(false);
  const [showAdelanto, setShowAdelanto] = useState(false);
  const [anioAdelanto, setAnioAdelanto] = useState(() => new Date().getFullYear());
  const [periodosSeleccionados, setPeriodosSeleccionados] = useState<string[]>([]);
  const [infoPeriodos, setInfoPeriodos] = useState<{
    montoMensual: number | null;
    periodosPagados: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConcepto, setShowConcepto] = useState(false);
  const [showSaldoExtra, setShowSaldoExtra] = useState(false);
  const [usarDosMetodos, setUsarDosMetodos] = useState(false);
  const [metodoPagoId, setMetodoPagoId] = useState<number>(1);
  const [montoUnicoInput, setMontoUnicoInput] = useState("");
  const [montoEfectivoInput, setMontoEfectivoInput] = useState("");
  const [mixtoTouched, setMixtoTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resumenCobro, setResumenCobro] = useState<ResumenCobroConfirmado | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!socioId) return;
    const load = async () => {
      try {
        setMontoUnicoInput("");
        if (!isEditMode) {
          setShowAdelanto(false);
          setAnioAdelanto(new Date().getFullYear());
          setPeriodosSeleccionados([]);
          setMixtoTouched(false);
          setSubmitAttempted(false);
        }
        let cuotasOperacion: CuotaItem[] = [];

        if (isEditMode) {
          const operacion = await getEditOperacion<{
            id: number;
            total: number;
            metodoPago?: { id: number; nombre: string };
            lineas: Array<{
              id: number;
              tipoLinea: string;
              cuotaId?: number;
              cuota?: { id: number; periodo: string; monto: number };
              concepto?: string;
              descripcion?: string;
              monto: number;
            }>;
          }>();
          if (operacion) {
            cuotasOperacion = operacion.lineas.flatMap((linea) => {
              const cuotaId = linea.cuotaId ?? linea.cuota?.id;
              if (linea.tipoLinea !== "CUOTA" || !cuotaId) {
                return [];
              }

              return [
                {
                  id: cuotaId,
                  periodo: linea.cuota?.periodo ?? `Cuota #${cuotaId}`,
                  monto: Number(linea.monto),
                },
              ];
            });
            const selectedCuotaIds = cuotasOperacion.map((cuota) => cuota.id);
            setSeleccionadas(selectedCuotaIds);

            const conceptosForm = operacion.lineas
              .filter((l) => l.tipoLinea === "CONCEPTO" && l.concepto)
              .map((l, idx) => ({
                id: `concepto-${idx}`,
                concepto: l.concepto ?? "",
                monto: l.monto.toString(),
              }));
            if (conceptosForm.length > 0) {
              setConceptos(conceptosForm);
              setShowConcepto(true);
            }

            if (operacion.metodoPago) {
              setMetodoPagoId(operacion.metodoPago.id);
            }
          }
        }

        const [socioData, data, periodos] = await Promise.all([
          mobileApi.obtenerSocioMobile(socioId),
          mobileApi.cuotasPendientes(socioId),
          isEditMode
            ? Promise.resolve(null)
            : mobileApi.obtenerPeriodosCobroMobile(socioId).catch(() => {
                setError("No se pudieron cargar los períodos nuevos. Volvé a abrir el cobro para intentarlo de nuevo.");
                return null;
              }),
        ]);
        setSocioInfo(socioData);
        if (socioData?.creditoIndividual != null) {
          setCreditoDisponible(Number(socioData.creditoIndividual));
        }
        setInfoPeriodos(periodos);
        if (cuotasOperacion.length > 0) {
          const cuotasOperacionIds = new Set(cuotasOperacion.map((cuota) => cuota.id));
          setCuotas([
            ...cuotasOperacion,
            ...data.filter((cuota) => !cuotasOperacionIds.has(cuota.id)),
          ]);
        } else {
          setCuotas(data);
          if (!isEditMode) setSeleccionadas(data.length === 1 ? [data[0].id] : []);
        }
        setCuotasCargadas(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando cuotas");
      } finally {
        setLoadingCuotas(false);
      }
    };
    void load();
  }, [socioId, isEditMode]);

  const periodosPendientes = useMemo(() => new Set(cuotas.map(({ periodo }) => periodo)), [cuotas]);
  const periodosPendientesSeleccionados = useMemo(
    () => new Set(cuotas.filter((cuota) => seleccionadas.includes(cuota.id)).map(({ periodo }) => periodo)),
    [cuotas, seleccionadas],
  );
  const periodosPagados = useMemo(() => new Set(infoPeriodos?.periodosPagados), [infoPeriodos]);
  const periodosNuevos = useMemo(
    () =>
      isEditMode || infoPeriodos?.montoMensual == null
        ? []
        : periodosSeleccionados
            .filter((periodo) => !periodosPendientes.has(periodo) && !periodosPagados.has(periodo))
            .sort(),
    [isEditMode, infoPeriodos, periodosSeleccionados, periodosPendientes, periodosPagados],
  );
  const cantidadPeriodos = seleccionadas.length + periodosNuevos.length;
  const excedeLimite = periodosNuevos.length > 0 && cantidadPeriodos > MAX_PERIODOS_COBRO;

  const totalCuotas = useMemo(() => {
    return (
      cuotas
        .filter((cuota) => seleccionadas.includes(cuota.id))
        .reduce((acc, cuota) => acc + Number(cuota.monto), 0) +
      periodosNuevos.length * Number(infoPeriodos?.montoMensual ?? 0)
    );
  }, [cuotas, seleccionadas, periodosNuevos, infoPeriodos]);

  const cuotasVisibles = useMemo(() => [...cuotas].sort((a, b) => a.periodo.localeCompare(b.periodo)), [cuotas]);

  const conceptosValidos = useMemo(() => {
    return conceptos
      .map((item) => ({
        concepto: item.concepto.trim(),
        monto: parseMontoInputToAmount(item.monto),
      }))
      .filter((item) => item.concepto.length > 0 && item.monto > 0);
  }, [conceptos]);

  const totalConceptos = useMemo(() => {
    return conceptosValidos.reduce((acc, item) => acc + item.monto, 0);
  }, [conceptosValidos]);

  const total = totalCuotas + totalConceptos;

  const creditoAplicadoTotal = Math.min(total, creditoDisponible);

  // Net payable after credit
  const totalNeto = Math.max(total - creditoAplicadoTotal, 0);
  const totalCents = toCents(totalNeto);
  const montoUnicoCentsIngresado = parseMontoInputToCents(montoUnicoInput);
  const montoUnicoInputVacio = montoUnicoInput.trim().length === 0;
  const montoUnicoCents = montoUnicoInputVacio ? totalCents : montoUnicoCentsIngresado;
  const montoEfectivoCents = parseMontoInputToCents(montoEfectivoInput);
  const montoTransferenciaCents = Math.max(totalCents - montoEfectivoCents, 0);
  const pagoUnicoValido = total > 0 && montoUnicoCents >= totalCents;
  const splitValido =
    !usarDosMetodos ||
    (montoEfectivoCents > 0 && montoTransferenciaCents > 0 && montoEfectivoCents < totalCents);

  const getStableIdempotencyKey = (installationId: string, signature: string) => {
    if (idempotencyRef.current?.signature === signature) {
      return idempotencyRef.current.key;
    }

    const key = `${installationId}-${Date.now()}`;
    idempotencyRef.current = { signature, key };
    return key;
  };

  const obtenerCreditoVigente = async () => {
    try {
      const socio = await mobileApi.obtenerSocioMobile(socioId);
      const credito = Number(socio?.creditoIndividual ?? creditoDisponible);
      return Number.isFinite(credito) && credito >= 0 ? credito : creditoDisponible;
    } catch {
      if (!isEditMode) {
        throw new Error("No se pudo actualizar el saldo a favor. Verificá la conexión y volvé a intentarlo.");
      }
      return creditoDisponible;
    }
  };

  const toggleCuota = (id: number) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleTodasPendientes = () => {
    setSeleccionadas((prev) =>
      prev.length === cuotas.length ? [] : cuotas.map((cuota) => cuota.id),
    );
  };

  const updateConcepto = (id: string, field: "concepto" | "monto", value: string) => {
    setConceptos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const addConcepto = () => {
    setConceptos((prev) => [
      ...prev,
      { id: `concepto-${Date.now()}`, concepto: "", monto: "" },
    ]);
  };

  const removeConcepto = (id: string) => {
    setConceptos((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], concepto: "", monto: "" }];
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const socioLabel =
    socioNombre && socioApellido
      ? `${socioApellido}, ${socioNombre}`
      : socioInfo
        ? `${socioInfo.apellido}, ${socioInfo.nombre}`
        : null;

  const volverDespuesDeCobro = () => {
    if (isEditMode) {
      router.replace("/cobradora/mis-cobranzas");
    } else if (fromGrupo) {
      router.replace(`/cobradora/grupo-familiar/${fromGrupo}`);
    } else {
      router.replace("/cobradora/home");
    }
  };

  const confirmarPago = async () => {
    if (excedeLimite) return;
    setSubmitAttempted(true);
    setError(null);
    setLoading(true);
    let shouldClearEdit = false;
    try {
      if (total <= 0) {
        throw new Error("Seleccioná al menos una cuota o agregá un concepto");
      }

      const creditoVigente = await obtenerCreditoVigente();
      const creditoAplicadoVigente = Math.min(total, creditoVigente);
      const totalNetoVigente = Math.max(total - creditoAplicadoVigente, 0);
      const totalCentsVigente = toCents(totalNetoVigente);
      if (!isEditMode && totalCentsVigente !== totalCents) {
        setCreditoDisponible(creditoVigente);
        throw new Error("El saldo a favor cambió. Revisá el total actualizado y confirmá nuevamente.");
      }
      const montoUnicoCentsParaEnviar =
        montoUnicoInputVacio
          ? totalCentsVigente
          : montoUnicoCents;
      const montoTransferenciaCentsParaEnviar = Math.max(
        totalCentsVigente - montoEfectivoCents,
        0,
      );
      const pagoUnicoValidoVigente = total > 0 && montoUnicoCentsParaEnviar >= totalCentsVigente;
      const splitValidoVigente =
        !usarDosMetodos ||
        (montoEfectivoCents > 0 &&
          montoTransferenciaCentsParaEnviar > 0 &&
          montoEfectivoCents < totalCentsVigente);

      const payloadPago = usarDosMetodos
        ? {
            pagos: [
              { metodoPagoId: 1, monto: montoEfectivoCents / 100 },
              { metodoPagoId: 2, monto: montoTransferenciaCentsParaEnviar / 100 },
            ],
          }
        : {
            pagos: [{ metodoPagoId, monto: montoUnicoCentsParaEnviar / 100 }],
          };

      if (!usarDosMetodos && !pagoUnicoValidoVigente) {
        throw new Error(
          `Ingresá un monto igual o mayor a ${pesos(totalNetoVigente)} para registrar el cobro`,
        );
      }

      if (usarDosMetodos && !splitValidoVigente) {
        throw new Error(
          `Para pago mixto, cargá un importe en efectivo mayor a $0 y menor a ${pesos(totalNetoVigente)}`,
        );
      }

      const binding = await getBinding();
      if (!binding) {
        throw new Error("Las cobranzas no están listas. Volvé al inicio y reintentá.");
      }

      const totalAEnviar = usarDosMetodos
        ? totalNetoVigente
        : montoUnicoCentsParaEnviar / 100;

      const periodosCobrados = [
        ...cuotas.filter((cuota) => seleccionadas.includes(cuota.id)).map((cuota) => cuota.periodo),
        ...periodosNuevos,
      ].sort();
      const partesDetalle: string[] = [];
      if (periodosCobrados.length > 0) {
        partesDetalle.push(
          `${periodosCobrados.length} ${periodosCobrados.length === 1 ? "cuota" : "cuotas"} (${resumirPeriodos(periodosCobrados)})`,
        );
      }
      if (conceptosValidos.length > 0) {
        partesDetalle.push(conceptosValidos.map((c) => c.concepto).join(", "));
      }
      const metodoResumen =
        totalAEnviar === 0
          ? "Saldo a favor"
          : usarDosMetodos
            ? `Efectivo ${pesos(montoEfectivoCents / 100)} + Transferencia ${pesos(montoTransferenciaCentsParaEnviar / 100)}`
            : METODOS_PAGO.find((item) => item.id === metodoPagoId)?.nombre ?? "Efectivo";

      if (isEditMode && editingOperacionId) {
        await mobileApi.vincularDispositivo({
          installationId: binding.installationId,
          cobradorId: binding.cobradorId,
        });
        await mobileApi.actualizarOperacionCobro(editingOperacionId, {
          cuotaIds: seleccionadas,
          conceptos: conceptosValidos,
          ...payloadPago,
          cobradorId: binding.cobradorId,
          installationId: binding.installationId,
          total: totalAEnviar,
          referencia: undefined,
          observaciones: undefined,
        });
        setResumenCobro({
          socio: socioLabel,
          detalle: partesDetalle.join(" · "),
          metodo: metodoResumen,
          totalCobrado: totalAEnviar,
          creditoAplicado: creditoAplicadoVigente,
          saldoGenerado: usarDosMetodos ? 0 : Math.max(0, totalAEnviar - totalNetoVigente),
        });
        setSuccess(true);
        shouldClearEdit = true;
        showToast("¡Cobro actualizado exitosamente!", "success");
      } else {
        const operationSignature = JSON.stringify({
          socioId,
          cuotaIds: [...seleccionadas].sort((a, b) => a - b),
          periodosNuevos: [...periodosNuevos].sort(),
          conceptos: conceptosValidos,
          pagos: payloadPago.pagos,
          total: totalAEnviar,
          montoNetoEsperado: totalCentsVigente,
        });

        const payload = {
          socioId,
          cuotaIds: seleccionadas,
          conceptos: conceptosValidos,
          ...payloadPago,
          actorCobro: "COBRADOR",
          origenCobro: "MOBILE",
          installationId: binding.installationId,
          cobradorId: binding.cobradorId,
          total: totalAEnviar,
          idempotencyKey: getStableIdempotencyKey(
            binding.installationId,
            operationSignature,
          ),
        };
        if (periodosNuevos.length > 0) {
          const periodos = [
            ...cuotas.filter((cuota) => seleccionadas.includes(cuota.id)).map((cuota) => cuota.periodo),
            ...periodosNuevos,
          ];
          await mobileApi.registrarCobroPeriodosMobile(socioId, {
            periodos,
            conceptos: conceptosValidos,
            pagos: payloadPago.pagos,
            installationId: binding.installationId,
            cobradorId: binding.cobradorId,
            total: totalAEnviar,
            idempotencyKey: payload.idempotencyKey,
            totalCuotasEsperado: totalCuotas,
            creditoEsperado: creditoVigente,
          });
        } else {
          await mobileApi.registrarOperacionCobro({ ...payload, montoNetoEsperado: totalCentsVigente / 100 });
        }

        setResumenCobro({
          socio: socioLabel,
          detalle: partesDetalle.join(" · "),
          metodo: metodoResumen,
          totalCobrado: totalAEnviar,
          creditoAplicado: creditoAplicadoVigente,
          saldoGenerado: usarDosMetodos ? 0 : Math.max(0, totalAEnviar - totalNetoVigente),
        });
        setSuccess(true);
        showToast("¡Cobro registrado exitosamente!", "success");
      }
    } catch (err) {
      if (!isEditMode && err instanceof Error && esConflictoDeImporte(err)) {
        try {
          setCreditoDisponible(await obtenerCreditoVigente());
          setError(MENSAJE_NETO_DESACTUALIZADO);
        } catch (refreshError) {
          setError(refreshError instanceof Error ? refreshError.message : MENSAJE_NETO_DESACTUALIZADO);
        }
      } else {
        setError(err instanceof Error ? err.message : "Error registrando cobro");
      }
    } finally {
      setLoading(false);
      if (isEditMode && shouldClearEdit) {
        void clearEditOperacion();
      }
    }
  };

  const cobroCents = usarDosMetodos ? totalCents : montoUnicoCents;
  const montoFooterCents = !usarDosMetodos && !pagoUnicoValido ? totalCents : cobroCents;
  const saldoNuevo = usarDosMetodos ? 0 : Math.max(0, montoUnicoCents - totalCents) / 100;
  const cubiertoPorSaldo = !isEditMode && total > 0 && totalCents === 0 && !usarDosMetodos && saldoNuevo === 0 && !showSaldoExtra;
  const metodoVisible = usarDosMetodos
    ? "Efectivo y transferencia"
    : METODOS_PAGO.find((item) => item.id === metodoPagoId)?.nombre ?? "Efectivo";
  const textoConfirmar = isEditMode
    ? "Guardar cambios"
    : total <= 0
      ? "Confirmar cobro"
      : montoFooterCents === 0
        ? "Registrar con saldo a favor"
        : `Cobrar ${pesos(montoFooterCents / 100)}`;
  const confirmacionDeshabilitada =
    loading || excedeLimite || total <= 0 || (usarDosMetodos ? !splitValido : !pagoUnicoValido);

  const resumenFooterTexto = useMemo(() => {
    const partes: string[] = [];
    if (seleccionadas.length > 0) {
      partes.push(
        `${seleccionadas.length} ${seleccionadas.length === 1 ? "pendiente" : "pendientes"}`,
      );
    }
    if (periodosNuevos.length > 0) {
      partes.push(
        `${periodosNuevos.length} ${periodosNuevos.length === 1 ? "adelantada" : "adelantadas"}`,
      );
    }
    if (conceptosValidos.length > 0) {
      partes.push(
        `${conceptosValidos.length} ${conceptosValidos.length === 1 ? "extra" : "extras"}`,
      );
    }
    const items = partes.join(" + ");
    const medio = cubiertoPorSaldo ? "Saldo a favor" : metodoVisible;
    const creditoTexto =
      creditoAplicadoTotal > 0 ? ` · Saldo aplicado: ${pesos(creditoAplicadoTotal)}` : "";
    return `${items} · ${medio}${creditoTexto}`;
  }, [seleccionadas.length, periodosNuevos.length, conceptosValidos.length, cubiertoPorSaldo, metodoVisible, creditoAplicadoTotal]);

  const mostrarErrorMixto = (mixtoTouched || submitAttempted) && !splitValido && totalCents > 0;

  // Success mini-receipt state
  if (success) {
    return (
      <View
        className="flex-1 bg-background items-center justify-center p-6"
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <View className="w-full max-w-sm items-center gap-5">
          <View className="items-center gap-3">
            <View
              className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center"
              accessibilityElementsHidden
            >
              <CheckCircle size={44} color="#047857" />
            </View>
            <Text className="text-foreground font-bold text-2xl text-center">
              {isEditMode ? "¡Cobro actualizado!" : "¡Cobro registrado!"}
            </Text>
          </View>

          {resumenCobro && (
            <View className="w-full rounded-2xl border border-border bg-card p-5 gap-3">
              {resumenCobro.socio && (
                <View className="flex-row justify-between gap-3">
                  <Text className="text-muted-foreground text-sm">Socio</Text>
                  <Text className="text-foreground text-sm font-semibold text-right flex-1">
                    {resumenCobro.socio}
                  </Text>
                </View>
              )}
              {resumenCobro.detalle.length > 0 && (
                <View className="flex-row justify-between gap-3">
                  <Text className="text-muted-foreground text-sm">Concepto</Text>
                  <Text className="text-foreground text-sm font-medium text-right flex-1">
                    {resumenCobro.detalle}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between gap-3">
                <Text className="text-muted-foreground text-sm">Medio</Text>
                <Text className="text-foreground text-sm font-medium text-right flex-1">
                  {resumenCobro.metodo}
                </Text>
              </View>
              {resumenCobro.creditoAplicado > 0 && (
                <View className="flex-row justify-between gap-3">
                  <Text className="text-muted-foreground text-sm">Saldo aplicado</Text>
                  <Text className="text-foreground text-sm font-medium">
                    {pesos(resumenCobro.creditoAplicado)}
                  </Text>
                </View>
              )}
              <View className="border-t border-border pt-3 flex-row justify-between items-center">
                <Text className="text-foreground text-base font-semibold">Total cobrado</Text>
                <Text className="text-foreground text-xl font-bold">
                  {pesos(resumenCobro.totalCobrado)}
                </Text>
              </View>
              {resumenCobro.saldoGenerado > 0 && (
                <View className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <Text className="text-emerald-900 text-xs font-semibold">
                    Quedaron {pesos(resumenCobro.saldoGenerado)} como saldo a favor
                  </Text>
                </View>
              )}
            </View>
          )}

          <Button size="lg" className="w-full" onPress={volverDespuesDeCobro}>
            Listo
          </Button>
        </View>
      </View>
    );
  }

  // Loading state with immediate header context
  if (loadingCuotas) {
    return (
      <View className="flex-1 bg-background">
        <View
          className="bg-primary rounded-b-[28px] px-6"
          style={{ paddingTop: Math.max(insets.top + 8, 16), paddingBottom: 20 }}
        >
          <View className="flex-row items-center gap-3 mb-2">
            <ScreenBackButton onPress={() => router.back()} tone="light" />
            <View className="flex-1" />
          </View>
          <Text className="text-primary-foreground font-bold text-2xl tracking-tight">
            {isEditMode ? "Editar pago" : "Registrar pago"}
          </Text>
          {socioLabel && (
            <Text className="text-primary-foreground font-semibold text-base mt-1">
              {socioLabel}
            </Text>
          )}
        </View>

        <View className="px-6 pt-6 gap-4" accessibilityRole="progressbar" accessibilityLabel="Cargando cuotas pendientes">
          <View className="h-6 w-40 rounded-lg bg-muted" />
          <View className="h-14 w-full rounded-2xl bg-muted" />
          <View className="h-14 w-full rounded-2xl bg-muted" />
          <View className="flex-row items-center justify-center gap-3 pt-4">
            <Spinner size="sm" accessibilityLabel="Cargando cuotas pendientes" />
            <Text className="text-muted-foreground text-sm">Cargando cuotas...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Header */}
        <View
          className="bg-primary rounded-b-[28px] px-6"
          style={{ paddingTop: Math.max(insets.top + 8, 16), paddingBottom: 20 }}
        >
          <View className="flex-row items-center gap-3 mb-2">
            <ScreenBackButton onPress={() => router.back()} tone="light" />
            <View className="flex-1" />
          </View>

          <Text
            className="text-primary-foreground font-bold text-2xl tracking-tight"
            accessibilityRole="header"
          >
            {isEditMode ? "Editar pago" : "Registrar pago"}
          </Text>
          {socioLabel && (
            <Text className="text-primary-foreground font-semibold text-base mt-1">
              {socioLabel}
            </Text>
          )}

          <View className="flex-row flex-wrap items-center gap-2 mt-3">
            <View
              className={cn(
                "rounded-full px-3 py-1",
                creditoDisponible > 0
                  ? "bg-card"
                  : "bg-black/20 border border-white/25",
              )}
              accessibilityLabel={`Saldo a favor: ${pesos(creditoDisponible)}`}
            >
              <Text
                className={cn(
                  "text-xs font-semibold",
                  creditoDisponible > 0 ? "text-primary" : "text-primary-foreground",
                )}
              >
                Saldo a favor: {pesos(creditoDisponible)}
              </Text>
            </View>

            {socioInfo?.categoriaNombre === "ADHERENTE" && (
              <View
                className="rounded-full bg-black/25 border border-white/25 px-3 py-1 flex-row items-center gap-1.5"
                accessibilityLabel={`Declaración jurada: ${socioInfo.declaracionJurada ? "presentada" : "pendiente"}`}
              >
                {socioInfo.declaracionJurada ? (
                  <Check size={12} color="#ffffff" />
                ) : (
                  <X size={12} color="#ffffff" />
                )}
                <Text className="text-xs font-semibold text-primary-foreground">
                  Declaración jurada {socioInfo.declaracionJurada ? "Presentada" : "Pendiente"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Area */}
        <View className="px-6 pt-5 pb-6 gap-5">
          {/* 1. Cuotas pendientes */}
          <View className="gap-3" accessibilityLabel="Cuotas pendientes">
            <View className="flex-row items-center justify-between gap-2">
              <Text
                className="text-foreground text-lg font-bold tracking-tight"
                accessibilityRole="header"
              >
                {isEditMode ? "Cuotas" : "Cuotas pendientes"}
              </Text>
              {cuotas.length > 1 && (
                <Pressable
                  onPress={toggleTodasPendientes}
                  accessibilityRole="button"
                  accessibilityLabel={
                    seleccionadas.length === cuotas.length
                      ? "Quitar todas las cuotas pendientes"
                      : "Seleccionar todas las cuotas pendientes"
                  }
                  className="min-h-11 px-3 justify-center rounded-xl active:bg-muted"
                >
                  <Text className="text-primary text-sm font-semibold">
                    {seleccionadas.length === cuotas.length ? "Ninguna" : "Todas"}
                  </Text>
                </Pressable>
              )}
            </View>

            {cuotasVisibles.length === 0 ? (
              !cuotasCargadas ? (
                <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex-row items-center gap-2.5">
                  <AlertCircle size={18} color="hsl(0, 72%, 43%)" />
                  <Text className="text-destructive text-sm font-medium flex-1">
                    No se pudieron consultar las cuotas
                  </Text>
                </View>
              ) : isEditMode ? (
                <Text className="text-muted-foreground text-sm">Sin cuotas</Text>
              ) : (
                <View className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 flex-row items-center gap-3">
                  <CheckCircle2 size={20} color="#047857" />
                  <View className="flex-1 gap-0.5">
                    <Text className="text-emerald-950 font-semibold text-base">Está al día</Text>
                    <Text className="text-emerald-800 text-xs">
                      No tiene cuotas pendientes. Podés adelantar meses abajo.
                    </Text>
                  </View>
                </View>
              )
            ) : (
              <View className="gap-2.5">
                {cuotasVisibles.map((cuota) => {
                  const selected = seleccionadas.includes(cuota.id);
                  const periodo = nombrePeriodo(cuota.periodo);
                  return (
                    <Pressable
                      key={cuota.id}
                      onPress={() => toggleCuota(cuota.id)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${periodo}, ${pesos(Number(cuota.monto))}`}
                      accessibilityState={{ checked: selected }}
                      aria-checked={selected}
                    >
                      <View
                        className={cn(
                          "rounded-2xl px-4 py-3.5 min-h-14 border flex-row items-center gap-3",
                          selected ? "border-primary bg-primary/10" : "border-border bg-card",
                        )}
                      >
                        <View
                          className={cn(
                            "w-6 h-6 rounded-md border-2 items-center justify-center",
                            selected ? "bg-primary border-primary" : "border-muted-foreground bg-card",
                          )}
                          accessibilityElementsHidden
                        >
                          {selected && <Check size={15} color="#ffffff" />}
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium text-base text-foreground">{periodo}</Text>
                        </View>
                        <Text className="font-bold text-base text-foreground">
                          {pesos(Number(cuota.monto))}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {cuotas.length > 1 && (
              <Text className="text-muted-foreground text-xs" accessibilityLiveRegion="polite">
                {seleccionadas.length} de {cuotas.length} pendientes seleccionadas
              </Text>
            )}
          </View>

          {/* 2. Adelantar cuotas */}
          {!isEditMode && infoPeriodos?.montoMensual != null && (
            <View className="gap-3">
              <View className="rounded-2xl border border-border bg-card overflow-hidden">
                <Pressable
                  onPress={() => setShowAdelanto(!showAdelanto)}
                  accessibilityRole="button"
                  accessibilityLabel={showAdelanto ? "Ocultar meses" : "Adelantar cuotas"}
                  accessibilityState={{ expanded: showAdelanto }}
                  aria-expanded={showAdelanto}
                  className="min-h-14 px-4 py-3 flex-row items-center gap-3 active:bg-muted"
                >
                  <View
                    className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center"
                    accessibilityElementsHidden
                  >
                    <CalendarPlus size={18} color="hsl(146, 68%, 24%)" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-base font-semibold">
                      {showAdelanto ? "Ocultar meses" : "Adelantar cuotas"}
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      {pesos(infoPeriodos.montoMensual)} por mes
                    </Text>
                  </View>
                  {periodosNuevos.length > 0 && (
                    <View className="rounded-full bg-primary px-2.5 py-0.5">
                      <Text className="text-primary-foreground text-xs font-bold">
                        {periodosNuevos.length}
                      </Text>
                    </View>
                  )}
                  {showAdelanto ? (
                    <ChevronUp size={20} color="hsl(0, 0%, 38%)" />
                  ) : (
                    <ChevronDown size={20} color="hsl(0, 0%, 38%)" />
                  )}
                </Pressable>

                {showAdelanto && (
                  <View className="border-t border-border p-4 gap-3">
                    {/* Year switcher */}
                    <View className="flex-row items-center justify-between">
                      <Button
                        variant="outline"
                        size="icon"
                        className="min-h-12 min-w-12"
                        onPress={() => setAnioAdelanto((anio) => anio - 1)}
                        disabled={anioAdelanto <= MIN_ANIO_ADELANTO}
                        accessibilityLabel="Año anterior"
                      >
                        <ChevronLeft size={20} color="hsl(var(--foreground))" />
                      </Button>
                      <View className="items-center">
                        <Text
                          className="text-xl font-bold text-foreground"
                          accessibilityLiveRegion="polite"
                        >
                          {anioAdelanto}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {pesos(infoPeriodos.montoMensual)} / mes
                        </Text>
                      </View>
                      <Button
                        variant="outline"
                        size="icon"
                        className="min-h-12 min-w-12"
                        onPress={() => setAnioAdelanto((anio) => anio + 1)}
                        disabled={anioAdelanto >= MAX_ANIO_ADELANTO}
                        accessibilityLabel="Año siguiente"
                      >
                        <ChevronRight size={20} color="hsl(var(--foreground))" />
                      </Button>
                    </View>

                    {/* 12-month grid */}
                    <View className="gap-2">
                      {[0, 3, 6, 9].map((inicio) => (
                        <View key={inicio} className="flex-row gap-2">
                          {mesesDelAnio.slice(inicio, inicio + 3).map((nombre, indice) => {
                            const periodo = `${anioAdelanto}-${String(inicio + indice + 1).padStart(2, "0")}`;
                            const esPagado = periodosPagados.has(periodo);
                            const esPendiente = !esPagado && periodosPendientes.has(periodo);
                            const pendienteEnCobro = esPendiente && periodosPendientesSeleccionados.has(periodo);
                            const estado = esPagado ? "Pagado" : esPendiente ? "Pendiente" : null;
                            const checked = periodosNuevos.includes(periodo);
                            const disabled =
                              estado !== null ||
                              loading ||
                              (!checked && cantidadPeriodos >= MAX_PERIODOS_COBRO);

                            return (
                              <Pressable
                                key={periodo}
                                accessibilityRole="checkbox"
                                accessibilityLabel={`${nombre} ${anioAdelanto}${estado ? `, ${estado.toLowerCase()}` : ""}`}
                                accessibilityState={{ checked, disabled }}
                                aria-checked={checked}
                                aria-disabled={disabled}
                                disabled={disabled}
                                onPress={() =>
                                  setPeriodosSeleccionados((actuales) =>
                                    actuales.includes(periodo)
                                      ? actuales.filter((item) => item !== periodo)
                                      : [...actuales, periodo],
                                  )
                                }
                                className={cn(
                                  "flex-1 min-w-0 min-h-14 items-center justify-center rounded-xl border px-1.5 py-2",
                                  checked
                                    ? "border-primary bg-primary/10"
                                    : esPagado
                                      ? "border-emerald-200 bg-emerald-50"
                                      : esPendiente
                                        ? "border-amber-200 bg-amber-50"
                                        : "border-border bg-background",
                                )}
                              >
                                <Text
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  className={cn(
                                    "text-center text-sm",
                                    checked
                                      ? "text-foreground font-bold"
                                      : esPagado
                                        ? "text-emerald-950 font-medium"
                                        : esPendiente
                                          ? "text-amber-950 font-medium"
                                          : "text-foreground",
                                  )}
                                >
                                  {nombre}
                                </Text>
                                {(estado || checked) && (
                                  <View className="flex-row items-center gap-0.5 mt-0.5">
                                    {checked && <Check size={11} color="hsl(146, 68%, 24%)" />}
                                    {esPagado && <Check size={11} color="#065f46" />}
                                    <Text
                                      numberOfLines={1}
                                      className={cn(
                                        "text-center text-xs",
                                        checked
                                          ? "text-primary font-semibold"
                                          : esPagado
                                            ? "text-emerald-800 font-medium"
                                            : "text-amber-900 font-medium",
                                      )}
                                    >
                                      {checked
                                        ? "Marcado"
                                        : esPagado
                                          ? "Pagado"
                                          : pendienteEnCobro
                                            ? "En cobro"
                                            : "Pendiente"}
                                    </Text>
                                  </View>
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      ))}
                    </View>

                    {cantidadPeriodos >= MAX_PERIODOS_COBRO && (
                      <Text accessibilityRole="alert" className="text-foreground text-xs font-medium">
                        El límite es de {MAX_PERIODOS_COBRO} cuotas por cobro.
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {periodosNuevos.length > 0 && (
                <View className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 flex-row items-center justify-between gap-3">
                  <Text className="text-foreground text-sm font-medium flex-1" accessibilityLiveRegion="polite">
                    {`${periodosNuevos.length} ${periodosNuevos.length === 1 ? "mes" : "meses"}: ${resumirPeriodos(periodosNuevos)}`}
                  </Text>
                  <Pressable
                    onPress={() => setPeriodosSeleccionados([])}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar adelanto"
                    className="min-h-11 px-3 justify-center rounded-xl border border-border bg-card active:bg-muted"
                  >
                    <Text className="text-destructive text-xs font-semibold">Quitar</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Validación en edit mode sin cuotas ni conceptos */}
          {isEditMode && total <= 0 && seleccionadas.length === 0 && conceptosValidos.length === 0 && (
            <View className="bg-destructive/10 border border-destructive/20 rounded-2xl p-3.5 flex-row items-center gap-2.5">
              <AlertCircle size={18} color="hsl(0, 72%, 43%)" />
              <Text
                className="text-destructive text-xs font-medium flex-1"
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                Seleccioná al menos una cuota o agregá un concepto para guardar.
              </Text>
            </View>
          )}

          {/* 3. Medio de pago (selector segmentado horizontal siempre estable) */}
          <View className="gap-3 border-t border-border pt-4">
            <Text className="text-foreground text-base font-bold" accessibilityRole="header">
              Medio de pago
            </Text>

            {cubiertoPorSaldo ? (
              <View className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex-row items-center gap-2.5">
                <CheckCircle2 size={18} color="#047857" />
                <Text className="text-emerald-950 text-sm font-medium flex-1">
                  Cubierto totalmente con saldo a favor ({pesos(creditoAplicadoTotal)}).
                </Text>
              </View>
            ) : (
              <>
                <View
                  className="flex-row gap-1 rounded-2xl border border-border bg-muted p-1"
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Medio de pago"
                >
                  {[
                    ...METODOS_PAGO.map((m) => ({
                      id: m.id as number | null,
                      label: m.nombre,
                      a11y: m.nombre,
                      flexClass: m.id === 2 ? "flex-[1.4]" : "flex-[1.05]",
                    })),
                    {
                      id: null,
                      label: "Mixto",
                      a11y: "Combinar efectivo y transferencia",
                      flexClass: "flex-[0.85]",
                    },
                  ].map(({ id, label, a11y, flexClass }) => {
                    const checked =
                      id === null ? usarDosMetodos : !usarDosMetodos && metodoPagoId === id;
                    return (
                      <Pressable
                        key={id ?? "mixto"}
                        onPress={() => {
                          setUsarDosMetodos(id === null);
                          if (id !== null) {
                            setMetodoPagoId(id);
                            setMixtoTouched(false);
                          } else {
                            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
                          }
                        }}
                        accessibilityRole="radio"
                        accessibilityLabel={a11y}
                        accessibilityState={{ checked }}
                        aria-checked={checked}
                        className={cn(
                          flexClass,
                          "min-h-12 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-2 border",
                          checked
                            ? "border-primary bg-card"
                            : "border-transparent bg-transparent",
                        )}
                      >
                        {checked && (
                          <View
                            className="w-2 h-2 rounded-full bg-primary"
                            accessibilityElementsHidden
                          />
                        )}
                        <Text
                          numberOfLines={1}
                          className={cn(
                            "text-sm",
                            checked ? "text-primary font-bold" : "text-foreground font-medium",
                          )}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {isEditMode && !usarDosMetodos && (
                  <View className="rounded-2xl border border-border bg-card p-4 gap-3">
                    <Input
                      label="¿Cuánto paga el socio?"
                      placeholder={String(totalNeto)}
                      keyboardType="numeric"
                      value={montoUnicoInput}
                      onChangeText={setMontoUnicoInput}
                      leftIcon={<Text className="text-muted-foreground font-semibold">$</Text>}
                      helperText={`Si lo dejás vacío se cobra ${pesos(totalNeto)}. Ingresá más para dejar saldo a favor.`}
                    />

                    {!pagoUnicoValido && totalCents > 0 && (
                      <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex-row items-center gap-2">
                        <AlertCircle size={16} color="hsl(0, 72%, 43%)" />
                        <Text
                          className="text-destructive text-xs font-medium flex-1"
                          accessibilityRole="alert"
                          accessibilityLiveRegion="assertive"
                        >
                          Ingresá un monto igual o mayor a {pesos(totalNeto)}. El excedente queda como saldo a favor.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {usarDosMetodos && (
                  <View className="rounded-2xl border border-border bg-card p-4 gap-3">
                    <Input
                      label="¿Cuánto en efectivo?"
                      placeholder="0"
                      keyboardType="numeric"
                      value={montoEfectivoInput}
                      onChangeText={(value) => {
                        setMixtoTouched(true);
                        setMontoEfectivoInput(value);
                      }}
                      leftIcon={<Text className="text-muted-foreground font-semibold">$</Text>}
                      helperText="El resto se completa automáticamente como transferencia."
                    />

                    <View className="rounded-xl bg-muted px-3.5 py-2.5 flex-row items-center justify-between gap-2">
                      <Text className="text-muted-foreground text-sm font-medium">
                        Resto por transferencia
                      </Text>
                      <Text
                        className="text-foreground font-bold text-lg"
                        accessibilityLabel={`Monto en transferencia: ${pesos(montoTransferenciaCents / 100)}`}
                      >
                        {pesos(montoTransferenciaCents / 100)}
                      </Text>
                    </View>

                    {mostrarErrorMixto && (
                      <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex-row items-center gap-2">
                        <AlertCircle size={16} color="hsl(0, 72%, 43%)" />
                        <Text
                          className="text-destructive text-xs font-medium flex-1"
                          accessibilityRole="alert"
                          accessibilityLiveRegion="assertive"
                        >
                          Ingresá un monto mayor a $0 y menor a {pesos(totalNeto)} para el efectivo.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </View>

          {/* 4. Acciones opcionales directas (sin cajón "Otras opciones") */}
          <View className="gap-3">
            {/* Dejar saldo a favor */}
            {!isEditMode && !usarDosMetodos && total > 0 && (
              <View className="rounded-2xl border border-border bg-card overflow-hidden">
                <Pressable
                  onPress={() => {
                    if (showSaldoExtra) setMontoUnicoInput("");
                    setShowSaldoExtra(!showSaldoExtra);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showSaldoExtra ? "Quitar saldo a favor adicional" : "Dejar saldo a favor"
                  }
                  accessibilityState={{ expanded: showSaldoExtra }}
                  aria-expanded={showSaldoExtra}
                  className="min-h-14 px-4 py-3 flex-row items-center gap-3 active:bg-muted"
                >
                  <View
                    className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center"
                    accessibilityElementsHidden
                  >
                    <Wallet size={18} color="hsl(146, 68%, 24%)" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-base font-semibold">
                      Dejar saldo a favor
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      Si el socio entrega de más, el vuelto queda a favor
                    </Text>
                  </View>
                  {saldoNuevo > 0 && (
                    <View className="rounded-full bg-primary px-2.5 py-0.5">
                      <Text className="text-primary-foreground text-xs font-bold">
                        +{pesos(saldoNuevo)}
                      </Text>
                    </View>
                  )}
                  {showSaldoExtra ? (
                    <ChevronUp size={20} color="hsl(0, 0%, 38%)" />
                  ) : (
                    <ChevronDown size={20} color="hsl(0, 0%, 38%)" />
                  )}
                </Pressable>

                {showSaldoExtra && (
                  <View className="border-t border-border p-4 gap-3">
                    <Input
                      label="Importe que entrega el socio"
                      placeholder={String(totalNeto)}
                      keyboardType="numeric"
                      value={montoUnicoInput}
                      onChangeText={setMontoUnicoInput}
                      leftIcon={<Text className="text-muted-foreground font-semibold">$</Text>}
                      helperText={
                        totalNeto > 0
                          ? `Vacío = ${pesos(totalNeto)} exactos. Lo que supere ese monto queda como saldo a favor, sin pagar otros meses.`
                          : "Ya está cubierto con saldo a favor. Ingresá lo que entrega el socio para sumarlo como saldo a favor."
                      }
                      error={!pagoUnicoValido ? `Ingresá al menos ${pesos(totalNeto)}.` : undefined}
                    />
                    {saldoNuevo > 0 && (
                      <View className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex-row items-center gap-2">
                        <CheckCircle2 size={16} color="#047857" />
                        <Text className="text-emerald-900 text-xs font-semibold flex-1">
                          Quedan {pesos(saldoNuevo)} como saldo a favor
                        </Text>
                      </View>
                    )}
                    {!montoUnicoInputVacio && (
                      <Pressable
                        onPress={() => setMontoUnicoInput("")}
                        accessibilityRole="button"
                        accessibilityLabel="Borrar importe ingresado"
                        className="min-h-11 self-start px-3 justify-center rounded-xl border border-border bg-background active:bg-muted"
                      >
                        <Text className="text-foreground text-xs font-semibold">
                          {totalNeto > 0
                            ? `Borrar y cobrar el monto exacto (${pesos(totalNeto)})`
                            : "Borrar importe"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Cobro extra */}
            <View
              className="rounded-2xl border border-border bg-card overflow-hidden"
              accessibilityLabel="Conceptos adicionales"
            >
              <Pressable
                onPress={() => setShowConcepto(!showConcepto)}
                accessibilityRole="button"
                accessibilityLabel={showConcepto ? "Ocultar cobros extra" : "¿Cobrar algo más?"}
                accessibilityHint={
                  showConcepto ? "Oculta esta sección" : "Agrega inscripción, uniforme u otros cobros"
                }
                accessibilityState={{ expanded: showConcepto }}
                aria-expanded={showConcepto}
                className="min-h-14 px-4 py-3 flex-row items-center gap-3 active:bg-muted"
              >
                <View
                  className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center"
                  accessibilityElementsHidden
                >
                  <PlusCircle size={18} color="hsl(146, 68%, 24%)" />
                </View>
                <View className="flex-1">
                  <Text className="text-foreground text-base font-semibold">
                    ¿Cobrar algo más?
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    Inscripción, uniforme, multa u otros
                  </Text>
                </View>
                {totalConceptos > 0 && (
                  <View className="rounded-full bg-primary px-2.5 py-0.5">
                    <Text className="text-primary-foreground text-xs font-bold">
                      +{pesos(totalConceptos)}
                    </Text>
                  </View>
                )}
                {showConcepto ? (
                  <ChevronUp size={20} color="hsl(0, 0%, 38%)" />
                ) : (
                  <ChevronDown size={20} color="hsl(0, 0%, 38%)" />
                )}
              </Pressable>

              {showConcepto && (
                <View className="border-t border-border p-4 gap-4">
                  {conceptos.map((item, index) => (
                    <View
                      key={item.id}
                      className={cn("gap-3", index > 0 && "border-t border-border pt-4")}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-foreground text-sm font-semibold">
                          Cobro extra {index + 1}
                        </Text>
                        <Pressable
                          onPress={() => removeConcepto(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Quitar cobro ${index + 1}`}
                          accessibilityHint="Elimina este cobro"
                          className="min-h-11 px-3 justify-center rounded-xl active:bg-muted"
                        >
                          <Text className="text-destructive text-sm font-semibold">Quitar</Text>
                        </Pressable>
                      </View>
                      <Input
                        label="Concepto"
                        placeholder="Ej: Inscripción, uniforme, multa"
                        value={item.concepto}
                        onChangeText={(value) => updateConcepto(item.id, "concepto", value)}
                        accessibilityLabel="¿Qué estás cobrando?"
                      />
                      <Input
                        label="¿Cuánto?"
                        placeholder="0"
                        keyboardType="numeric"
                        value={item.monto}
                        onChangeText={(value) => updateConcepto(item.id, "monto", value)}
                        leftIcon={<Text className="text-muted-foreground font-semibold">$</Text>}
                      />
                    </View>
                  ))}

                  <Button
                    variant="outline"
                    size="default"
                    onPress={addConcepto}
                    leftIcon={<Plus size={16} color="hsl(146, 68%, 24%)" />}
                    accessibilityLabel="Agregar otro cobro"
                    accessibilityHint="Añade otro cobro extra"
                  >
                    Agregar otro cobro
                  </Button>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer sticky */}
      <View
        className="bg-card border-t border-border"
        style={{
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: Math.max(12, insets.bottom),
        }}
        accessibilityLabel="Resumen de cobro"
      >
        <View className="gap-2.5">
          {error && (
            <View
              className="bg-destructive/10 border border-destructive/20 rounded-xl px-3.5 py-2.5 flex-row items-center gap-2"
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <AlertCircle size={16} color="hsl(0, 72%, 43%)" />
              <Text className="text-destructive font-medium text-xs flex-1">{error}</Text>
            </View>
          )}

          {total > 0 && (
            <View className="gap-0.5" accessibilityLiveRegion="polite">
              <View className="flex-row justify-between items-baseline gap-2">
                <Text className="text-foreground font-semibold text-base">Total a cobrar</Text>
                <Text
                  className="text-foreground font-bold text-xl"
                  accessibilityLabel={`Total a cobrar: ${pesos(montoFooterCents / 100)}`}
                >
                  {pesos(montoFooterCents / 100)}
                </Text>
              </View>
              <Text className="text-muted-foreground text-xs">{resumenFooterTexto}</Text>
              {saldoNuevo > 0 && (
                <Text className="text-primary font-semibold text-xs">
                  {`Nuevo saldo a favor por este cobro: ${pesos(saldoNuevo)}`}
                </Text>
              )}
            </View>
          )}

          <Button
            size="lg"
            disabled={confirmacionDeshabilitada}
            loading={loading}
            onPress={() => void confirmarPago()}
            accessibilityLabel={isEditMode ? "Confirmar edición" : textoConfirmar}
            accessibilityHint={
              isEditMode
                ? "Guarda los cambios de la operación"
                : "Registra el cobro y completa la operación"
            }
            accessibilityState={{ disabled: confirmacionDeshabilitada }}
          >
            {textoConfirmar}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
