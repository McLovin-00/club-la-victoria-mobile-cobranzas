import { useState, useCallback, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { Users, CreditCard, CheckSquare } from "lucide-react-native";
import { Button } from "../../../components/ui/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Spinner } from "../../../components/ui/spinner";
import { ScreenBackButton } from "../../../components/ui/screen-back-button";
import { MiembroGrupoItem } from "../../../components/grupo-familiar";
import { mobileApi } from "../../../lib/api";
import type { GrupoFamiliarDetalle } from "../../../lib/types";

export default function GrupoFamiliarDetalleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const grupoId = Number(id);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [grupo, setGrupo] = useState<GrupoFamiliarDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGrupo = useCallback(async () => {
    if (!grupoId) return;

    setError(null);
    try {
      const data = await mobileApi.getGrupoFamiliar(grupoId);
      setGrupo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando grupo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [grupoId]);

  useEffect(() => {
    void loadGrupo();
  }, [loadGrupo]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadGrupo();
  }, [loadGrupo]);

  const handleMiembroPress = (socioId: number, nombre: string, apellido: string) => {
    router.push(`/cobradora/pago?socioId=${socioId}&fromGrupo=${grupoId}&nombre=${encodeURIComponent(nombre)}&apellido=${encodeURIComponent(apellido)}`);
  };

  const toggleSeleccion = (socioId: number) => {
    setSeleccionados((prev) =>
      prev.includes(socioId)
        ? prev.filter((id) => id !== socioId)
        : [...prev, socioId]
    );
  };

  const toggleAllDeuda = () => {
    if (!grupo) return;
    const conDeuda = grupo.miembros.filter((m) => m.cantidadCuotasPendientes > 0);
    
    if (seleccionados.length === conDeuda.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(conDeuda.map((m) => m.id));
    }
  };

  const handleCobrarSeleccionados = () => {
    if (seleccionados.length === 0) return;
    router.push(`/cobradora/pago-grupo?grupoId=${grupoId}&socioIds=${seleccionados.join(',')}`);
  };

  const handleBack = () => {
    router.back();
  };

  // Loading state
  if (loading) {
    return (
      <View
        className="flex-1 bg-background items-center justify-center p-6"
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando grupo familiar"
        accessibilityLiveRegion="polite"
      >
        <Spinner size="lg" />
        <Text className="text-muted-foreground mt-4 text-base">
          Cargando grupo...
        </Text>
      </View>
    );
  }

  // Error state (no group data)
  if (error && !grupo) {
    return (
      <View className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            className="bg-primary rounded-b-[40px] px-6 shadow-sm"
            style={{ paddingTop: Math.max(insets.top + 20, 40), paddingBottom: 56 }}
          >
            <View className="flex-row items-center gap-3 mb-5">
              <ScreenBackButton onPress={handleBack} tone="light" />
              <View className="flex-1" />
            </View>
            <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
              Error
            </Text>
          </View>

          <View className="px-6 pt-8 pb-6 gap-4">
            <View
              className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex-row items-center"
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text className="text-destructive font-medium text-sm flex-1">
                {error || "Grupo no encontrado"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!grupo) return null;

  const miembrosConDeuda = grupo.miembros.filter((m) => m.cantidadCuotasPendientes > 0);
  const miembrosSinDeuda = grupo.miembros.filter((m) => m.cantidadCuotasPendientes === 0);

  const totalSeleccionado = grupo.miembros
    .filter((m) => seleccionados.includes(m.id))
    .reduce((acc, curr) => acc + curr.totalPendiente, 0);

  const todosSeleccionados = 
    miembrosConDeuda.length > 0 && 
    seleccionados.length === miembrosConDeuda.length;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Header */}
        <View
          className="bg-primary rounded-b-[40px] px-6 shadow-sm"
          style={{ paddingTop: Math.max(insets.top + 20, 40), paddingBottom: 56 }}
        >
          <View className="flex-row items-center gap-3 mb-5">
            <ScreenBackButton onPress={handleBack} tone="light" />
            <View className="flex-1" />
          </View>

          <View accessibilityRole="header">
            <Text className="text-primary-foreground/80 font-medium text-sm mb-1 uppercase tracking-wider">
              Grupo Familiar
            </Text>
            <Text
              className="text-primary-foreground font-bold text-3xl tracking-tight"
              numberOfLines={2}
            >
              {grupo.nombre}
            </Text>
            {grupo.descripcion && (
              <Text className="text-primary-foreground/70 text-sm mt-1">
                {grupo.descripcion}
              </Text>
            )}
          </View>
        </View>

        {/* Content Area */}
        <View className="px-6 pt-8 pb-6 gap-4">
          {/* Error inline */}
          {error && (
            <View
              className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex-row items-center"
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text className="text-destructive font-medium text-sm flex-1">{error}</Text>
            </View>
          )}

          {/* Summary Card */}
          <View
            className="bg-card rounded-3xl p-5 border border-border/40 shadow-sm"
            accessibilityRole="summary"
            accessibilityLabel={`Grupo ${grupo.nombre}: ${grupo.cantidadMiembros} miembros, ${grupo.miembrosConDeuda} con deuda, $${grupo.totalPendiente.toLocaleString("es-AR")} total pendiente`}
          >
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <View className="flex-row items-center gap-1">
                  <Users size={16} color="hsl(var(--primary))" />
                  <Text
                    className="text-2xl font-bold text-foreground"
                    accessibilityLabel={`${grupo.cantidadMiembros} miembros`}
                  >
                    {grupo.cantidadMiembros}
                  </Text>
                </View>
                <Text className="text-muted-foreground text-xs">Miembros</Text>
              </View>

              <View className="items-center flex-1">
                <Text
                  className="text-2xl font-bold text-amber-600"
                  accessibilityLabel={`${grupo.miembrosConDeuda} miembros con deuda`}
                >
                  {grupo.miembrosConDeuda}
                </Text>
                <Text className="text-muted-foreground text-xs">Con deuda</Text>
              </View>

              <View className="items-center flex-1">
                <Text
                  className="text-2xl font-bold text-destructive"
                  accessibilityLabel={`Total deuda: $${grupo.totalPendiente.toLocaleString("es-AR")}`}
                >
                  ${grupo.totalPendiente.toLocaleString("es-AR")}
                </Text>
                <Text className="text-muted-foreground text-xs">Total deuda</Text>
              </View>
            </View>
          </View>

          {/* Miembros con deuda */}
          {miembrosConDeuda.length > 0 && (
            <View className="gap-3">
              <View
                className="flex-row items-center justify-between mb-2"
                accessibilityRole="header"
              >
                <Text className="text-foreground text-xl font-bold tracking-tight">Cobrar</Text>
                <View
                  className="bg-secondary px-3 py-1 rounded-full"
                  accessibilityLabel={`${miembrosConDeuda.length} miembro${miembrosConDeuda.length !== 1 ? "s" : ""} con deuda`}
                >
                  <Text className="text-secondary-foreground font-semibold text-xs">
                    {miembrosConDeuda.length} miembro{miembrosConDeuda.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={toggleAllDeuda}
                className="flex-row items-center gap-2 mb-3 px-1 py-2"
                accessibilityRole="button"
                accessibilityLabel={todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos con deuda"}
              >
                <View
                  className={`w-5 h-5 rounded border items-center justify-center ${
                    todosSeleccionados ? "bg-primary border-primary" : "border-border"
                  }`}
                >
                  {todosSeleccionados && <CheckSquare size={14} color="#ffffff" />}
                </View>
                <Text className="text-sm font-medium text-foreground">
                  Seleccionar todos con deuda
                </Text>
              </Pressable>

              {miembrosConDeuda.map((miembro) => (
                <MiembroGrupoItem
                  key={miembro.id}
                  miembro={miembro}
                  onPress={() => handleMiembroPress(miembro.id, miembro.nombre, miembro.apellido)}
                  selectable={true}
                  selected={seleccionados.includes(miembro.id)}
                  onSelect={() => toggleSeleccion(miembro.id)}
                />
              ))}
            </View>
          )}

          {/* Miembros sin deuda */}
          {miembrosSinDeuda.length > 0 && (
            <View className="gap-3">
              <View
                className="flex-row items-center justify-between mb-2"
                accessibilityRole="header"
              >
                <Text className="text-foreground text-xl font-bold tracking-tight">Al día</Text>
                <View
                  className="bg-secondary px-3 py-1 rounded-full"
                  accessibilityLabel={`${miembrosSinDeuda.length} miembro${miembrosSinDeuda.length !== 1 ? "s" : ""} al día`}
                >
                  <Text className="text-secondary-foreground font-semibold text-xs">
                    {miembrosSinDeuda.length} miembro{miembrosSinDeuda.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
              {miembrosSinDeuda.map((miembro) => (
                <MiembroGrupoItem
                  key={miembro.id}
                  miembro={miembro}
                  onPress={() => handleMiembroPress(miembro.id, miembro.nombre, miembro.apellido)}
                />
              ))}
            </View>
          )}

          {/* Empty state */}
          {grupo.miembros.length === 0 && (
            <View
              className="items-center justify-center py-12 opacity-80"
              accessibilityRole="text"
              accessibilityLabel="Grupo sin miembros"
            >
              <Users size={48} color="hsl(var(--muted-foreground))" className="mb-5 opacity-40" />
              <Text className="text-foreground font-bold text-lg text-center mb-1">Sin miembros</Text>
              <Text className="text-muted-foreground text-sm text-center px-4">
                Este grupo no tiene socios asignados
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button for Group Payment */}
      {seleccionados.length > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-background border-t border-border"
          style={{
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          accessibilityLabel="Resumen de cobro grupal"
        >
          <View className="bg-card rounded-3xl p-4 border border-border/40 shadow-sm flex-row items-center justify-between">
            <View>
              <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {seleccionados.length} miembro{seleccionados.length !== 1 ? 's' : ''}
              </Text>
              <Text
                className="text-foreground font-bold text-2xl tracking-tight"
                accessibilityLabel={`Total a cobrar: $${totalSeleccionado.toLocaleString("es-AR")}`}
              >
                ${totalSeleccionado.toLocaleString("es-AR")}
              </Text>
    </View>
            <Button
              size="lg"
              leftIcon={<CreditCard size={20} color="#ffffff" />}
              onPress={handleCobrarSeleccionados}
              accessibilityLabel="Cobrar seleccionados"
            >
              Cobrar
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
