import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Receipt, Check, Plus, ChevronDown, ChevronUp, CreditCard, CheckCircle, Users } from "lucide-react-native";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";
import { ScreenBackButton } from "../../components/ui/screen-back-button";
import { useToast } from "../../components/ui/toast";
import { mobileApi } from "../../lib/api";
import { getBinding } from "../../lib/storage";
import { cn } from "../../lib/utils";
import type { ConceptoCobro, CobroSocioPayload } from "../../lib/types";

interface CuotaItem {
  id: number;
  periodo: string;
  monto: number;
}

interface SocioCobroState {
  socioId: number;
  nombre: string;
  apellido: string;
  cuotas: CuotaItem[];
  cuotasSeleccionadas: number[];
  conceptos: { id: string; concepto: string; monto: string }[];
  showConceptos: boolean;
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

export default function PagoGrupoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ grupoId?: string; socioIds?: string }>();
  const grupoId = Number(params.grupoId ?? 0);
  const socioIdsParam = params.socioIds ?? "";

  const [socios, setSocios] = useState<SocioCobroState[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSocios, setLoadingSocios] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    if (!socioIdsParam) {
      setLoadingSocios(false);
      setError("No se especificaron socios para cobrar");
      return;
    }

    const socioIds = socioIdsParam.split(",").map(Number).filter(Boolean);
    if (socioIds.length === 0) {
      setLoadingSocios(false);
      setError("IDs de socios inválidos");
      return;
    }

    const loadSociosData = async () => {
      try {
        const grupoData = await mobileApi.getGrupoFamiliar(grupoId);
        const sociosData: SocioCobroState[] = [];

        for (const socioId of socioIds) {
          const miembro = grupoData.miembros.find((m) => m.id === socioId);
          if (!miembro) continue;

          const cuotas = await mobileApi.cuotasPendientes(socioId);
          sociosData.push({
            socioId,
            nombre: miembro.nombre,
            apellido: miembro.apellido,
            cuotas,
            cuotasSeleccionadas: cuotas.map((c) => c.id),
            conceptos: [{ id: `concepto-${socioId}-0`, concepto: "", monto: "" }],
            showConceptos: false,
          });
        }

        setSocios(sociosData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoadingSocios(false);
      }
    };

    void loadSociosData();
  }, [grupoId, socioIdsParam]);

  const toggleCuota = (socioIndex: number, cuotaId: number) => {
    setSocios((prev) =>
      prev.map((s, i) => {
        if (i !== socioIndex) return s;
        const isSelected = s.cuotasSeleccionadas.includes(cuotaId);
        return {
          ...s,
          cuotasSeleccionadas: isSelected
            ? s.cuotasSeleccionadas.filter((id) => id !== cuotaId)
            : [...s.cuotasSeleccionadas, cuotaId],
        };
      })
    );
  };

  const toggleAllCuotas = (socioIndex: number) => {
    setSocios((prev) =>
      prev.map((s, i) => {
        if (i !== socioIndex) return s;
        const allSelected = s.cuotasSeleccionadas.length === s.cuotas.length;
        return {
          ...s,
          cuotasSeleccionadas: allSelected ? [] : s.cuotas.map((c) => c.id),
        };
      })
    );
  };

  const updateConcepto = (
    socioIndex: number,
    conceptoId: string,
    field: "concepto" | "monto",
    value: string
  ) => {
    setSocios((prev) =>
      prev.map((s, i) => {
        if (i !== socioIndex) return s;
        return {
          ...s,
          conceptos: s.conceptos.map((c) =>
            c.id === conceptoId ? { ...c, [field]: value } : c
          ),
        };
      })
    );
  };

  const addConcepto = (socioIndex: number) => {
    setSocios((prev) =>
      prev.map((s, i) => {
        if (i !== socioIndex) return s;
        return {
          ...s,
          conceptos: [
            ...s.conceptos,
            { id: `concepto-${s.socioId}-${Date.now()}`, concepto: "", monto: "" },
          ],
        };
      })
    );
  };

  const removeConcepto = (socioIndex: number, conceptoId: string) => {
    setSocios((prev) =>
      prev.map((s, i) => {
        if (i !== socioIndex) return s;
        const filtered = s.conceptos.filter((c) => c.id !== conceptoId);
        if (filtered.length === 0) {
          return {
            ...s,
            conceptos: [{ id: `concepto-${s.socioId}-0`, concepto: "", monto: "" }],
          };
        }
        return { ...s, conceptos: filtered };
      })
    );
  };

  const toggleShowConceptos = (socioIndex: number) => {
    setSocios((prev) =>
      prev.map((s, i) => {
        if (i !== socioIndex) return s;
        return { ...s, showConceptos: !s.showConceptos };
      })
    );
  };

  const totalCalculado = useMemo(() => {
    let total = 0;
    for (const socio of socios) {
      const cuotasTotal = socio.cuotas
        .filter((c) => socio.cuotasSeleccionadas.includes(c.id))
        .reduce((acc, c) => acc + Number(c.monto), 0);
      const conceptosValidos = socio.conceptos
        .filter((c) => c.concepto.trim().length > 0)
        .reduce((acc, c) => acc + Number(c.monto.replace(",", ".") || 0), 0);
      total += cuotasTotal + conceptosValidos;
    }
    return total;
  }, [socios]);

  const totalCents = toCents(totalCalculado);
  const montoEfectivoCents = parseMontoInputToCents(montoEfectivoInput);
  const montoTransferenciaCents = Math.max(totalCents - montoEfectivoCents, 0);
  const splitValido =
    !usarDosMetodos ||
    (montoEfectivoCents > 0 && montoTransferenciaCents > 0 && montoEfectivoCents < totalCents);

  const confirmarPago = async () => {
    setError(null);
    setLoading(true);
    try {
      if (totalCents <= 0) {
        throw new Error("El total debe ser mayor a cero");
      }

      const pagos = usarDosMetodos
        ? [
            { metodoPagoId: 1, monto: montoEfectivoCents / 100 },
            { metodoPagoId: 2, monto: montoTransferenciaCents / 100 },
          ]
        : [{ metodoPagoId, monto: totalCalculado }];

      if (usarDosMetodos && !splitValido) {
        throw new Error(
          "Para pago mixto, cargá un importe de efectivo mayor a 0 y menor al total"
        );
      }

      const binding = await getBinding();
      if (!binding) {
        throw new Error("No hay cobrador seleccionado. Configuralo desde Ajustes");
      }

      const cobros: CobroSocioPayload[] = socios.map((socio) => {
        const conceptos: ConceptoCobro[] = socio.conceptos
          .filter((c) => c.concepto.trim().length > 0)
          .map((c) => ({
            concepto: c.concepto.trim(),
            monto: Number(c.monto.replace(",", ".") || 0),
          }));

        return {
          socioId: socio.socioId,
          cuotaIds: socio.cuotasSeleccionadas.length > 0 ? socio.cuotasSeleccionadas : undefined,
          conceptos: conceptos.length > 0 ? conceptos : undefined,
        };
      });

      await mobileApi.registrarCobroGrupal({
        cobros,
        pagos,
        actorCobro: "COBRADOR",
        origenCobro: "MOBILE",
        installationId: binding.installationId,
        cobradorId: binding.cobradorId,
        total: totalCalculado,
        idempotencyKey: `${binding.installationId}-${Date.now()}`,
      });

      setSuccess(true);
      showToast("¡Cobro grupal registrado exitosamente!", "success");

      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      redirectTimeoutRef.current = setTimeout(() => {
        router.replace(`/cobradora/grupo-familiar/${grupoId}`);
        redirectTimeoutRef.current = null;
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error registrando cobro grupal");
    } finally {
      setLoading(false);
    }
  };

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
        <Text className="text-foreground font-bold text-2xl text-center">¡Cobro grupal registrado!</Text>
        <Text className="text-muted-foreground text-base text-center mt-2">
          Redirigiendo...
        </Text>
      </View>
    );
  }

  if (loadingSocios) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Spinner size="lg" accessibilityLabel="Cargando datos de socios" />
        <Text className="text-muted-foreground mt-4 text-base">Cargando socios...</Text>
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
              Cobro Grupal
            </Text>
            <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
              Registrar pago
            </Text>
          </View>
        </View>

        <View className="px-6 pt-8 pb-6 gap-4">
          {error && (
            <View
              className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex-row items-center"
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text className="text-destructive font-medium text-sm flex-1">{error}</Text>
            </View>
          )}

          {socios.length === 0 && !loadingSocios && (
            <View className="items-center justify-center py-12 opacity-80">
              <Users size={48} color="hsl(var(--muted-foreground))" className="mb-5 opacity-40" />
              <Text className="text-foreground font-bold text-lg text-center mb-1">
                Sin socios seleccionados
              </Text>
            </View>
          )}

          {socios.map((socio, socioIndex) => {
            const socioCuotasTotal = socio.cuotas
              .filter((c) => socio.cuotasSeleccionadas.includes(c.id))
              .reduce((acc, c) => acc + Number(c.monto), 0);
            const socioConceptosValidos = socio.conceptos
              .filter((c) => c.concepto.trim().length > 0)
              .reduce((acc, c) => acc + Number(c.monto.replace(",", ".") || 0), 0);
            const socioTotal = socioCuotasTotal + socioConceptosValidos;

            return (
              <View key={socio.socioId} className="gap-3">
                <View
                  className="flex-row items-center justify-between mb-2"
                  accessibilityRole="header"
                >
                  <Text className="text-foreground text-lg font-bold tracking-tight">
                    {socio.apellido}, {socio.nombre}
                  </Text>
                  <Text className="text-destructive font-bold text-base">
                    ${socioTotal.toLocaleString("es-AR")}
                  </Text>
                </View>

                {socio.cuotas.length > 0 && (
                  <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-muted-foreground text-sm font-medium">
                        Cuotas ({socio.cuotasSeleccionadas.length}/{socio.cuotas.length})
                      </Text>
                      <Pressable onPress={() => toggleAllCuotas(socioIndex)}>
                        <Text className="text-primary text-xs font-medium">
                          {socio.cuotasSeleccionadas.length === socio.cuotas.length
                            ? "Ninguna"
                            : "Todas"}
                        </Text>
                      </Pressable>
                    </View>
                    {socio.cuotas.map((cuota) => {
                      const selected = socio.cuotasSeleccionadas.includes(cuota.id);
                      return (
                        <Pressable
                          key={cuota.id}
                          onPress={() => toggleCuota(socioIndex, cuota.id)}
                          accessibilityRole="checkbox"
                          accessibilityLabel={`${cuota.periodo}, $${Number(cuota.monto).toLocaleString("es-AR")}`}
                          accessibilityState={{ checked: selected }}
                        >
                          <View
                            className={cn(
                              "bg-card rounded-2xl p-3 border flex-row items-center gap-3",
                              selected ? "border-primary bg-primary/5" : "border-border/40"
                            )}
                          >
                            <View
                              className={cn(
                                "w-5 h-5 rounded-full border-2 items-center justify-center",
                                selected ? "bg-primary border-primary" : "border-border"
                              )}
                            >
                              {selected && <Check size={12} color="#ffffff" />}
                            </View>
                            <Text
                              className={cn(
                                "flex-1 font-medium text-sm",
                                selected ? "text-foreground" : "text-muted-foreground"
                              )}
                            >
                              {cuota.periodo}
                            </Text>
                            <Text
                              className={cn(
                                "font-bold text-sm",
                                selected ? "text-foreground" : "text-muted-foreground"
                              )}
                            >
                              ${Number(cuota.monto).toLocaleString("es-AR")}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <Pressable
                  onPress={() => toggleShowConceptos(socioIndex)}
                  className="flex-row items-center gap-2 py-2"
                >
                  <Plus size={16} color="hsl(var(--primary))" />
                  <Text className="text-primary font-medium text-sm">
                    {socio.showConceptos ? "Ocultar conceptos" : "Agregar concepto"}
                  </Text>
                  {socio.showConceptos ? (
                    <ChevronUp size={16} color="hsl(var(--muted-foreground))" />
                  ) : (
                    <ChevronDown size={16} color="hsl(var(--muted-foreground))" />
                  )}
                </Pressable>

                {socio.showConceptos && (
                  <View className="bg-card rounded-2xl p-3 border border-border/40 gap-2">
                    {socio.conceptos.map((item, index) => (
                      <View key={item.id} className="gap-2 rounded-xl border border-border/40 p-2">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-foreground text-xs font-medium">
                            Concepto {index + 1}
                          </Text>
                          {socio.conceptos.length > 1 && (
                            <Pressable onPress={() => removeConcepto(socioIndex, item.id)}>
                              <Text className="text-destructive text-xs">Quitar</Text>
                            </Pressable>
                          )}
                        </View>
                        <View className="flex-row gap-2">
                          <View className="flex-1">
                            <Input
                              placeholder="Nombre"
                              value={item.concepto}
                              onChangeText={(v) => updateConcepto(socioIndex, item.id, "concepto", v)}
                            />
                          </View>
                          <View className="w-24">
                            <Input
                              placeholder="$0"
                              keyboardType="numeric"
                              value={item.monto}
                              onChangeText={(v) => updateConcepto(socioIndex, item.id, "monto", v)}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                    <Pressable onPress={() => addConcepto(socioIndex)} className="py-1">
                      <Text className="text-primary text-xs font-medium text-center">
                        + Agregar otro
                      </Text>
                    </Pressable>
                  </View>
                )}

                <View className="h-px bg-border/40 mt-2" />
              </View>
            );
          })}

          {socios.length > 0 && (
            <View className="gap-3 mt-4" accessibilityLabel="Método de pago">
              <View
                className="flex-row items-center justify-between mb-2"
                accessibilityRole="header"
              >
                <Text className="text-foreground text-xl font-bold tracking-tight">
                  Método de pago
                </Text>
              </View>

              <View
                className="flex-row gap-2"
                accessibilityRole="radiogroup"
                accessibilityLabel="Cantidad de métodos de pago"
              >
                <Pressable
                  onPress={() => setUsarDosMetodos(false)}
                  className="flex-1"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !usarDosMetodos }}
                >
                  <View
                    className={cn(
                      "bg-card rounded-3xl p-4 border shadow-sm items-center",
                      !usarDosMetodos ? "border-primary bg-primary" : "border-border/40"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-center font-bold text-sm",
                        !usarDosMetodos ? "text-primary-foreground" : "text-foreground"
                      )}
                    >
                      1 método
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setUsarDosMetodos(true)}
                  className="flex-1"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: usarDosMetodos }}
                >
                  <View
                    className={cn(
                      "bg-card rounded-3xl p-4 border shadow-sm items-center",
                      usarDosMetodos ? "border-primary bg-primary" : "border-border/40"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-center font-bold text-sm",
                        usarDosMetodos ? "text-primary-foreground" : "text-foreground"
                      )}
                    >
                      2 métodos
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
                        accessibilityState={{ selected }}
                      >
                        <View
                          className={cn(
                            "bg-card rounded-3xl p-4 border shadow-sm items-center",
                            selected ? "border-primary bg-primary" : "border-border/40"
                          )}
                        >
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
                <View className="bg-card rounded-3xl p-4 border border-border/40 shadow-sm gap-3">
                  <View className="gap-2">
                    <Input
                      label="Efectivo"
                      placeholder="0"
                      keyboardType="numeric"
                      value={montoEfectivoInput}
                      onChangeText={setMontoEfectivoInput}
                      leftIcon={<Text className="text-muted-foreground">$</Text>}
                    />
                  </View>

                  <View className="gap-1">
                    <Text className="text-foreground text-sm font-medium">Transferencia</Text>
                    <Text className="text-foreground font-semibold text-base">
                      $
                      {(montoTransferenciaCents / 100).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Se calcula automáticamente como diferencia.
                    </Text>
                  </View>

                  {!splitValido && totalCents > 0 && (
                    <Text className="text-xs text-destructive">
                      El efectivo debe ser mayor a $0 y menor al total.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {socios.length > 0 && (
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
              <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Total a cobrar
              </Text>
              <Text className="text-foreground font-bold text-2xl tracking-tight">
                ${totalCalculado.toLocaleString("es-AR")}
              </Text>
            </View>
            <Button
              size="lg"
              disabled={loading || totalCalculado <= 0 || !splitValido}
              loading={loading}
              leftIcon={!loading && <CreditCard size={20} color="#ffffff" />}
              onPress={() => void confirmarPago()}
              accessibilityLabel="Confirmar cobro grupal"
              accessibilityState={{ disabled: loading || totalCalculado <= 0 || !splitValido }}
            >
              Confirmar
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
