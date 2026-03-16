import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Receipt, Check, Plus, ChevronDown, ChevronUp, CreditCard, CheckCircle } from "lucide-react-native";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";
import { ScreenBackButton } from "../../components/ui/screen-back-button";
import { useToast } from "../../components/ui/toast";
import { mobileApi } from "../../lib/api";
import { getBinding } from "../../lib/storage";
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

const METODOS_PAGO = [
  { id: 1, nombre: "Efectivo" },
  { id: 2, nombre: "Transferencia" },
] as const;

const toCents = (value: number): number => Math.round(value * 100);

const parseMontoInputToCents = (value: string): number => {
  const normalizado = value.replace(".", "").replace(",", ".").trim();
  const parsed = Number(normalizado || 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return toCents(parsed);
};

export default function PagoCobradoraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ socioId?: string; fromGrupo?: string }>();
  const socioId = Number(params.socioId ?? 0);
  const fromGrupo = params.fromGrupo ? Number(params.fromGrupo) : null;

  const [cuotas, setCuotas] = useState<CuotaItem[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [conceptos, setConceptos] = useState<ConceptoAdicionalForm[]>([
    { id: "concepto-0", concepto: "", monto: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingCuotas, setLoadingCuotas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConcepto, setShowConcepto] = useState(false);
  const [usarDosMetodos, setUsarDosMetodos] = useState(false);
  const [metodoPagoId, setMetodoPagoId] = useState<number>(1);
  const [montoEfectivoInput, setMontoEfectivoInput] = useState("");
  const [success, setSuccess] = useState(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!socioId) return;
    const load = async () => {
      try {
        const data = await mobileApi.cuotasPendientes(socioId);
        setCuotas(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando cuotas");
      } finally {
        setLoadingCuotas(false);
      }
    };
    void load();
  }, [socioId]);

  const totalCuotas = useMemo(() => {
    return cuotas
      .filter((cuota) => seleccionadas.includes(cuota.id))
      .reduce((acc, cuota) => acc + Number(cuota.monto), 0);
  }, [cuotas, seleccionadas]);

  const conceptosValidos = useMemo(() => {
    return conceptos
      .map((item) => ({
        concepto: item.concepto.trim(),
        monto: Number(item.monto.replace(",", ".") || 0),
      }))
      .filter((item) => item.concepto.length > 0 && item.monto > 0);
  }, [conceptos]);

  const totalConceptos = useMemo(() => {
    return conceptosValidos.reduce((acc, item) => acc + item.monto, 0);
  }, [conceptosValidos]);

  const total = totalCuotas + totalConceptos;
  const totalCents = toCents(total);
  const montoEfectivoCents = parseMontoInputToCents(montoEfectivoInput);
  const montoTransferenciaCents = Math.max(totalCents - montoEfectivoCents, 0);
  const splitValido =
    !usarDosMetodos ||
    (montoEfectivoCents > 0 && montoTransferenciaCents > 0 && montoEfectivoCents < totalCents);

  const toggleCuota = (id: number) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
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

  const confirmarPago = async () => {
    setError(null);
    setLoading(true);
    try {
      if (totalCents <= 0) {
        throw new Error("El total debe ser mayor a cero");
      }

      const payloadPago = usarDosMetodos
        ? {
            pagos: [
              { metodoPagoId: 1, monto: montoEfectivoCents / 100 },
              { metodoPagoId: 2, monto: montoTransferenciaCents / 100 },
            ],
          }
        : { metodoPagoId };

      if (usarDosMetodos && !splitValido) {
        throw new Error(
          "Para pago mixto, cargá un importe de efectivo mayor a 0 y menor al total"
        );
      }

      const binding = await getBinding();
      if (!binding) {
        throw new Error("No hay cobrador seleccionado. Configuralo desde Ajustes");
      }

      await mobileApi.registrarOperacionCobro({
        socioId,
        cuotaIds: seleccionadas,
        conceptos: conceptosValidos,
        ...payloadPago,
        actorCobro: "COBRADOR",
        origenCobro: "MOBILE",
        installationId: binding.installationId,
        cobradorId: binding.cobradorId,
        total,
        idempotencyKey: `${binding.installationId}-${Date.now()}`,
      });

      setSuccess(true);
      showToast("¡Cobro registrado exitosamente!", "success");

      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      redirectTimeoutRef.current = setTimeout(() => {
        if (fromGrupo) {
          router.replace(`/cobradora/grupo-familiar/${fromGrupo}`);
        } else {
          router.replace("/cobradora/home");
        }
        redirectTimeoutRef.current = null;
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error registrando cobro");
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <View
        className="flex-1 bg-background items-center justify-center p-6"
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <View className="w-20 h-20 rounded-full bg-green-500/10 items-center justify-center mb-4" accessibilityElementsHidden>
          <CheckCircle size={48} color="hsl(142, 76%, 36%)" />
        </View>
        <Text className="text-foreground font-bold text-2xl text-center">¡Cobro registrado!</Text>
        <Text className="text-muted-foreground text-base text-center mt-2">
          Redirigiendo...
        </Text>
      </View>
    );
  }

  // Loading state
  if (loadingCuotas) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Spinner size="lg" accessibilityLabel="Cargando cuotas pendientes" />
        <Text className="text-muted-foreground mt-4 text-base">Cargando cuotas...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 132 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Header */}
        <View
          className="bg-primary rounded-b-[40px] px-6 shadow-sm"
          style={{ paddingTop: Math.max(insets.top + 20, 40), paddingBottom: 56 }}
        >
          <View className="flex-row items-center gap-3 mb-5">
            <ScreenBackButton onPress={() => router.back()} tone="light" />
            <View className="flex-1" />
          </View>

          <View accessibilityRole="header">
            <Text className="text-primary-foreground/80 font-medium text-sm mb-1 uppercase tracking-wider">
              Cobro
            </Text>
            <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
              Registrar pago
            </Text>
          </View>
        </View>

        {/* Content Area */}
        <View className="px-6 pt-8 pb-6 gap-4">
          {/* Error message */}
          {error && (
            <View
              className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex-row items-center"
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text className="text-destructive font-medium text-sm flex-1">{error}</Text>
            </View>
          )}

          {/* Cuotas pendientes section */}
          <View className="gap-3" accessibilityLabel="Cuotas pendientes">
            {/* Section header */}
            <View
              className="flex-row items-center justify-between mb-2"
              accessibilityRole="header"
            >
              <Text className="text-foreground text-xl font-bold tracking-tight">Cuotas</Text>
              {cuotas.length > 0 && (
                <View
                  className="bg-secondary px-3 py-1 rounded-full"
                  accessibilityLabel={`${cuotas.length} cuota${cuotas.length !== 1 ? "s" : ""} pendiente${cuotas.length !== 1 ? "s" : ""}`}
                >
                  <Text className="text-secondary-foreground font-semibold text-xs">
                    {cuotas.length} pendiente{cuotas.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>

            {/* Empty state */}
            {cuotas.length === 0 ? (
              <View
                className="items-center justify-center py-12 opacity-80"
                accessibilityRole="text"
              >
                <CheckCircle size={48} color="hsl(142, 76%, 36%)" className="mb-5 opacity-40" />
                <Text className="text-foreground font-bold text-lg text-center mb-1">Sin cuotas pendientes</Text>
                <Text className="text-muted-foreground text-sm text-center px-4">
                  Este socio no tiene cuotas pendientes
                </Text>
              </View>
            ) : (
              <>
                {cuotas.map((cuota) => {
                  const selected = seleccionadas.includes(cuota.id);
                  return (
                    <Pressable
                      key={cuota.id}
                      onPress={() => toggleCuota(cuota.id)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${cuota.periodo}, $${Number(cuota.monto).toLocaleString("es-AR")}`}
                      accessibilityHint="Toca para seleccionar o deseleccionar esta cuota"
                      accessibilityState={{ checked: selected }}
                    >
                      <View className={cn(
                        "bg-card rounded-3xl p-4 border shadow-sm flex-row items-center gap-3",
                        selected ? "border-primary bg-primary" : "border-border/40"
                      )}>
                        <View
                          className={cn(
                            "w-6 h-6 rounded-full border-2 items-center justify-center",
                            selected ? "bg-white border-white" : "border-border"
                          )}
                          accessibilityElementsHidden
                        >
                          {selected && <Check size={14} color="hsl(var(--primary))" />}
                        </View>
                        <View className="flex-1">
                          <Text className={cn("font-medium", selected ? "text-primary-foreground" : "text-foreground")}>{cuota.periodo}</Text>
                        </View>
                        <Text
                          className={cn(
                            "font-bold text-lg",
                            selected ? "text-primary-foreground" : "text-foreground"
                          )}
                        >
                          ${Number(cuota.monto).toLocaleString("es-AR")}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

                {seleccionadas.length > 0 && (
                  <Text
                    className="text-muted-foreground text-sm"
                    accessibilityLiveRegion="polite"
                  >
                    {seleccionadas.length} cuota{seleccionadas.length !== 1 ? "s" : ""} seleccionada{seleccionadas.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Metodo de pago */}
          <View className="gap-3" accessibilityLabel="Método de pago">
            <View
              className="flex-row items-center justify-between mb-2"
              accessibilityRole="header"
            >
              <Text className="text-foreground text-xl font-bold tracking-tight">Método de pago</Text>
            </View>

            <View
              className="flex-row gap-2"
              accessibilityRole="radiogroup"
              accessibilityLabel="¿Cómo vas a cobrar?"
            >
              <Pressable
                onPress={() => setUsarDosMetodos(false)}
                className="flex-1"
                accessibilityRole="radio"
                accessibilityLabel="Un solo método de pago (todo en efectivo o todo por transferencia)"
                accessibilityState={{ selected: !usarDosMetodos }}
              >
                <View className={cn(
                  "bg-card rounded-3xl p-4 border shadow-sm items-center",
                  !usarDosMetodos ? "border-primary bg-primary" : "border-border/40"
                )}>
                  <Text
                    className={cn(
                      "text-center font-bold text-sm",
                      !usarDosMetodos ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    Un solo pago
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setUsarDosMetodos(true)}
                className="flex-1"
                accessibilityRole="radio"
                accessibilityLabel="Combinar efectivo y transferencia"
                accessibilityState={{ selected: usarDosMetodos }}
              >
                <View className={cn(
                  "bg-card rounded-3xl p-4 border shadow-sm items-center",
                  usarDosMetodos ? "border-primary bg-primary" : "border-border/40"
                )}>
                  <Text
                    className={cn(
                      "text-center font-bold text-sm",
                      usarDosMetodos ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    Efectivo + Transfer.
                  </Text>
                </View>
              </Pressable>
            </View>

            {!usarDosMetodos ? (
              <View
                className="flex-row gap-2"
                accessibilityRole="radiogroup"
                accessibilityLabel="Seleccionar método de pago"
              >
                {METODOS_PAGO.map((metodo) => {
                  const selected = metodoPagoId === metodo.id;
                  return (
                    <Pressable
                      key={metodo.id}
                      onPress={() => setMetodoPagoId(metodo.id)}
                      className="flex-1"
                      accessibilityRole="radio"
                      accessibilityLabel={metodo.nombre}
                      accessibilityState={{ selected }}
                    >
                      <View className={cn(
                        "bg-card rounded-3xl p-4 border shadow-sm items-center",
                        selected ? "border-primary bg-primary" : "border-border/40"
                      )}>
                        <Text
                          className={cn(
                            "text-center font-bold text-sm",
                            selected ? "text-primary-foreground" : "text-foreground"
                          )}
                        >
                          {metodo.nombre}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View 
                  className="bg-card rounded-3xl p-4 gap-3"
                  style={{
                    borderWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.08)',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                {/* Helper text explicando cómo funciona */}
                <View className="bg-primary/5 rounded-xl p-3 mb-1">
                  <Text className="text-foreground text-xs leading-4">
                    💡 Ingresá cuánto te pagan en efectivo. El resto se completa automáticamente como transferencia.
                  </Text>
                </View>

                <View className="gap-2">
                  <Input
                    label="¿Cuánto en efectivo?"
                    placeholder="0"
                    keyboardType="numeric"
                    value={montoEfectivoInput}
                    onChangeText={setMontoEfectivoInput}
                    leftIcon={<Text className="text-muted-foreground">$</Text>}
                    helperText="El socio te paga esta parte en efectivo"
                  />
                </View>

                <View className="gap-1">
                  <Text className="text-muted-foreground text-xs font-medium">El resto por transferencia:</Text>
                  <Text
                    className="text-foreground font-bold text-xl"
                    accessibilityLabel={`Monto en transferencia: $${(montoTransferenciaCents / 100).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  >
                    ${(montoTransferenciaCents / 100).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                {!splitValido && totalCents > 0 && (
                  <View className="bg-destructive/10 rounded-xl p-3 flex-row items-center gap-2">
                    <Text
                      className="text-destructive text-xs flex-1"
                      accessibilityRole="alert"
                      accessibilityLiveRegion="assertive"
                    >
                      ⚠️ Ingresá un monto entre $1 y ${total.toLocaleString("es-AR")} para el efectivo.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Concepto adicional section */}
          <View className="gap-3" accessibilityLabel="Conceptos adicionales">
            <Pressable
              onPress={() => setShowConcepto(!showConcepto)}
              accessibilityLabel={showConcepto ? "Ocultar cobros extra" : "¿Cobrar algo más?"}
              accessibilityHint={showConcepto ? "Oculta esta sección" : "Agrega inscripción, uniforme u otros cobros"}
              accessibilityState={{ expanded: showConcepto }}
            >
              <View 
                className="bg-card rounded-3xl p-4 flex-row items-center"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <Plus size={20} color="hsl(var(--primary))" />
                  <Text className="text-primary font-bold text-sm">¿Cobrar algo más?</Text>
                </View>
                {showConcepto ? (
                  <ChevronUp size={20} color="hsl(var(--muted-foreground))" />
                ) : (
                  <ChevronDown size={20} color="hsl(var(--muted-foreground))" />
                )}
              </View>
            </Pressable>

            {showConcepto && (
              <View className="bg-card rounded-3xl p-4 border border-border/40 shadow-sm gap-3">
                {conceptos.map((item, index) => (
                  <View key={item.id} className="gap-2 rounded-2xl border border-border/40 p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-foreground text-sm font-medium">Cobro extra {index + 1}</Text>
                      <Pressable
                        onPress={() => removeConcepto(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar cobro ${index + 1}`}
                        accessibilityHint="Elimina este cobro"
                      >
                        <Text className="text-destructive text-xs font-medium">Quitar</Text>
                      </Pressable>
                    </View>
                    <Input
                      placeholder="Ej: Inscripción, uniforme, multa..."
                      value={item.concepto}
                      onChangeText={(value) => updateConcepto(item.id, "concepto", value)}
                      accessibilityLabel={`¿Qué estás cobrando?`}
                      helperText="Ej: inscripción, uniforme, multa..."
                    />
                    <Input
                      label="¿Cuánto?"
                      placeholder="0"
                      keyboardType="numeric"
                      value={item.monto}
                      onChangeText={(value) => updateConcepto(item.id, "monto", value)}
                      leftIcon={<Text className="text-muted-foreground">$</Text>}
                    />
                  </View>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onPress={addConcepto}
                  leftIcon={<Plus size={16} color="hsl(var(--primary))" />}
                  className="border-primary/40"
                  accessibilityLabel="Agregar otro cobro"
                  accessibilityHint="Añade otro cobro extra"
                >
                  + Agregar otro cobro
                </Button>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer sticky */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-background border-t border-border"
        style={{
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom,
        }}
        accessibilityLabel="Resumen de cobro"
      >
        <View className="bg-card rounded-3xl p-4 border border-border/40 shadow-sm flex-row items-center justify-between">
          <View>
            <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total a cobrar</Text>
            <Text
              className="text-foreground font-bold text-2xl tracking-tight"
              accessibilityLabel={`Total a cobrar: $${total.toLocaleString("es-AR")}`}
            >
              ${total.toLocaleString("es-AR")}
            </Text>
          </View>
          <Button
            size="lg"
            disabled={loading || total <= 0 || !splitValido}
            loading={loading}
            leftIcon={!loading && <CreditCard size={20} color="#ffffff" />}
            onPress={() => void confirmarPago()}
            accessibilityLabel="Confirmar cobro"
            accessibilityHint="Registra el cobro y completa la operación"
            accessibilityState={{ disabled: loading || total <= 0 || !splitValido }}
          >
            Confirmar cobro
          </Button>
        </View>
      </View>
    </View>
  );
}
