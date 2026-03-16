import { useState, useCallback, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, SearchX, Users } from "lucide-react-native";
import { ScreenBackButton } from "../../components/ui/screen-back-button";
import { Spinner } from "../../components/ui/spinner";
import { GrupoFamiliarCard } from "../../components/grupo-familiar";
import { mobileApi } from "../../lib/api";
import type { GrupoFamiliar } from "../../lib/types";

export default function GruposFamiliaresScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grupos, setGrupos] = useState<GrupoFamiliar[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Cargar grupos al montar
  const loadGrupos = useCallback(async () => {
    setError(null);
    try {
      const data = await mobileApi.getGruposFamiliares();
      setGrupos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando grupos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadGrupos();
  }, [loadGrupos]);

  useEffect(() => {
    void loadGrupos();
  }, [loadGrupos]);

  // Filtrar grupos por búsqueda
  const gruposFiltrados = busqueda.trim()
    ? grupos.filter((g) =>
        g.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : grupos;

  const handleGrupoPress = (grupoId: number) => {
    router.push(`/cobradora/grupo-familiar/${grupoId}`);
  };

  // Loading state
  if (loading) {
    return (
      <View
        className="flex-1 bg-background items-center justify-center p-6"
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando grupos familiares"
      >
        <Spinner size="lg" />
        <Text className="text-muted-foreground mt-4 text-base">
          Cargando grupos...
        </Text>
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
              Familias
            </Text>
            <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
              Grupos Familiares
            </Text>
            <Text className="text-primary-foreground/70 text-sm mt-1">
              Cobrar a familias completas más rápido
            </Text>
          </View>
        </View>

        {/* Floating Search Bar */}
        <View className="-mt-8 px-6 z-10">
          <View
            className="bg-card rounded-[24px] p-2 pl-5 flex-row items-center shadow-elevated border border-border/40"
            accessibilityRole="search"
          >
            <Search size={22} color="hsl(var(--muted-foreground))" className="opacity-80" />
            <TextInput
              className="flex-1 text-base font-medium text-foreground ml-3 py-3"
              placeholder="Buscar grupo por nombre..."
              placeholderTextColor="hsl(var(--muted-foreground))"
              value={busqueda}
              onChangeText={setBusqueda}
              returnKeyType="search"
              accessibilityLabel="Buscar grupo familiar"
              accessibilityHint="Escribe el nombre del grupo para filtrar"
            />
            {busqueda.trim().length > 0 && (
              <Pressable
                className="h-12 w-12 rounded-2xl items-center justify-center ml-2 bg-primary shadow-soft"
                onPress={() => setBusqueda("")}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
              >
                <SearchX size={20} color="white" />
              </Pressable>
            )}
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
          {gruposFiltrados.length > 0 && (
            <View
              className="flex-row items-center justify-between mb-2"
              accessibilityRole="header"
            >
              <Text className="text-foreground text-xl font-bold tracking-tight">Grupos</Text>
              <View
                className="bg-secondary px-3 py-1 rounded-full"
                accessibilityLabel={`${gruposFiltrados.length} grupo${gruposFiltrados.length !== 1 ? "s" : ""}`}
              >
                <Text className="text-secondary-foreground font-semibold text-xs">
                  {gruposFiltrados.length} grupo{gruposFiltrados.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          )}

          {/* Groups list */}
          {gruposFiltrados.length > 0 && (
            <View
              className="gap-3"
              accessibilityLabel="Lista de grupos familiares"
            >
              {gruposFiltrados.map((grupo) => (
                <GrupoFamiliarCard
                  key={grupo.id}
                  grupo={grupo}
                  onPress={() => handleGrupoPress(grupo.id)}
                />
              ))}
            </View>
          )}

          {/* Empty state - sin grupos */}
          {!error && grupos.length === 0 && (
            <View
              className="items-center justify-center py-12 opacity-80"
              accessibilityRole="text"
              accessibilityLabel="No hay grupos familiares"
            >
              <Users size={48} color="hsl(var(--muted-foreground))" className="mb-5 opacity-40" />
              <Text className="text-foreground font-bold text-lg text-center mb-1">No hay grupos familiares</Text>
              <Text className="text-muted-foreground text-sm text-center px-4">
                Los grupos se configuran desde el panel web
              </Text>
            </View>
          )}

          {/* Empty state - búsqueda sin resultados */}
          {!error && grupos.length > 0 && gruposFiltrados.length === 0 && (
            <View
              className="items-center justify-center py-12 opacity-80"
              accessibilityRole="text"
              accessibilityLabel={`Sin resultados para ${busqueda}`}
            >
              <SearchX size={48} color="hsl(var(--muted-foreground))" className="mb-5 opacity-40" />
              <Text className="text-foreground font-bold text-lg text-center mb-1">No se encontraron grupos</Text>
              <Text className="text-muted-foreground text-sm text-center px-4">
                Intenta con otro término de búsqueda
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
