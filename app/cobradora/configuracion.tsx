import { useEffect, useState } from "react";
import { Text, View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Users, Check, Settings } from "lucide-react-native";
import { Avatar } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import { ScreenBackButton } from "../../components/ui/screen-back-button";
import { mobileApi, CobradorActivo } from "../../lib/api";
import { getBinding, setBinding, StoredBinding } from "../../lib/storage";
import { cn } from "../../lib/utils";

export default function ConfiguracionCobradorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cobradores, setCobradores] = useState<CobradorActivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentBinding, setCurrentBinding] = useState<StoredBinding | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const binding = await getBinding();
        setCurrentBinding(binding);
        const data = await mobileApi.getCobradoresActivos();
        setCobradores(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando cobradores");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const cambiarCobrador = async (cobrador: CobradorActivo) => {
    setError(null);
    setSelectedId(cobrador.id);
    try {
      await setBinding({
        installationId: currentBinding?.installationId || "",
        cobradorId: cobrador.id,
        cobradorNombre: cobrador.nombre,
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cambiando cobrador");
      setSelectedId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View
        className="flex-1 bg-background items-center justify-center p-6"
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando cobradores"
      >
        <Spinner size="lg" />
        <Text className="text-muted-foreground mt-4 text-base">Cargando cobradores...</Text>
      </View>
    );
  }

  // Error state (no cobradores)
  if (error && cobradores.length === 0) {
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
              <ScreenBackButton onPress={() => router.back()} tone="light" />
              <View className="flex-1" />
            </View>
            <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
              Configuración
            </Text>
          </View>

          <View className="px-6 pt-8 pb-6 gap-4">
            <View
              className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex-row items-center"
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text className="text-destructive font-medium text-sm flex-1">{error}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Empty state
  if (cobradores.length === 0) {
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
              <ScreenBackButton onPress={() => router.back()} tone="light" />
              <View className="flex-1" />
            </View>
            <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
              Configuración
            </Text>
          </View>

          <View className="px-6 pt-8 pb-6 gap-4">
            <View
              className="items-center justify-center py-12 opacity-80"
              accessibilityRole="text"
              accessibilityLabel="No hay cobradores activos disponibles"
            >
              <Users size={48} color="hsl(var(--muted-foreground))" className="mb-5 opacity-40" />
              <Text className="text-foreground font-bold text-lg text-center mb-1">Sin cobradores</Text>
              <Text className="text-muted-foreground text-sm text-center px-4">
                No hay cobradores activos disponibles en este momento.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

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
            <ScreenBackButton onPress={() => router.back()} tone="light" />
            <View className="flex-1" />
          </View>

          <View accessibilityRole="header">
            <Text className="text-primary-foreground/80 font-medium text-sm mb-1 uppercase tracking-wider">
              Ajustes
            </Text>
            <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
              Seleccionar cobrador
            </Text>
            <Text className="text-primary-foreground/70 text-sm mt-1">
              Elige tu cuenta actual
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

          {/* Results Header */}
          <View
            className="flex-row items-center justify-between mb-2"
            accessibilityRole="header"
          >
            <Text className="text-foreground text-xl font-bold tracking-tight">Cobradores</Text>
            <View
              className="bg-secondary px-3 py-1 rounded-full"
              accessibilityLabel={`${cobradores.length} cobrador${cobradores.length !== 1 ? "es" : ""}`}
            >
              <Text className="text-secondary-foreground font-semibold text-xs">
                {cobradores.length} cobrador{cobradores.length !== 1 ? "es" : ""}
              </Text>
            </View>
          </View>

          {/* Cobradores list */}
          <View
            className="gap-3"
            accessibilityRole="list"
            accessibilityLabel="Lista de cobradores activos"
          >
            {cobradores.map((cobrador) => {
              const isSelected = selectedId === cobrador.id;
              const isCurrent = currentBinding?.cobradorId === cobrador.id;
              const initials = cobrador.nombre
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2);

              return (
                <Pressable
                  key={cobrador.id}
                  onPress={() => !isSelected && void cambiarCobrador(cobrador)}
                  disabled={isSelected}
                  accessibilityRole="button"
                  accessibilityLabel={`${cobrador.nombre}. ${isCurrent ? "Cuenta actual." : ""} Activo. Toca para seleccionar`}
                  accessibilityHint={isCurrent ? "Esta es tu cuenta actual" : "Cambia a esta cuenta de cobrador"}
                  accessibilityState={{ disabled: isSelected, selected: isCurrent }}
                >
                  <View className={cn(
                    "bg-card rounded-3xl p-4 border shadow-sm flex-row items-center gap-4",
                    isCurrent || isSelected ? "border-primary border-2" : "border-border/40"
                  )}>
                    {/* Avatar Circle */}
                    <View
                      className={cn(
                        "w-12 h-12 rounded-full items-center justify-center border",
                        isCurrent ? "bg-primary/10 border-primary/20" : "bg-primary/10 border-primary/20"
                      )}
                      accessibilityElementsHidden
                    >
                      <Text className="text-primary font-bold text-sm tracking-wider">
                        {initials.toUpperCase()}
                      </Text>
                    </View>

                    {/* Info */}
                    <View className="flex-1 justify-center gap-1.5">
                      <Text className="text-foreground font-bold text-base leading-tight">
                        {cobrador.nombre}
                      </Text>
                      <View className="flex-row items-center gap-2" accessibilityElementsHidden>
                        <Badge variant="success" size="sm">
                          Activo
                        </Badge>
                        {isCurrent && (
                          <View className="flex-row items-center gap-1">
                            <Check size={12} color="hsl(var(--primary))" />
                            <Text className="text-primary text-xs font-medium">Actual</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Action */}
                    {isSelected ? (
                      <Spinner size="sm" accessibilityLabel="Cambiando cuenta" />
                    ) : (
                      <View className="bg-primary/10 px-3 py-2 rounded-full border border-primary/20" accessibilityElementsHidden>
                        <Text className="text-primary text-[10px] font-bold tracking-widest uppercase">
                          {isCurrent ? "Actual" : "Elegir"}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
