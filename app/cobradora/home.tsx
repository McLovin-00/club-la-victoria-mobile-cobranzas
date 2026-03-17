import { useState, useEffect, useRef, useCallback } from "react";
import { Text, View, FlatList, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, Users } from "lucide-react-native";
import { Avatar } from "../../components/ui/avatar";
import { Spinner } from "../../components/ui/spinner";
import { ScreenBackButton } from "../../components/ui/screen-back-button";
import { mobileApi } from "../../lib/api";
import type { SocioConGrupo } from "../../lib/types";
import { getBinding } from "../../lib/storage";

type SocioItem = SocioConGrupo;

type EstadoDeuda = "AL_DIA" | "CON_DEUDA" | "MOROSO";

const PAGE_SIZE = 50;

export default function HomeCobradoraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [socios, setSocios] = useState<SocioItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cobradorNombre, setCobradorNombre] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);
  
  // Infinite scroll state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load cobrador name on mount
  useEffect(() => {
    const loadInitialData = async () => {
      const binding = await getBinding();
      if (binding) {
        setCobradorNombre(binding.cobradorNombre ?? "");
      }
    };
    void loadInitialData();
    
    // Cargar primera página de socios
    void cargarSocios("", 0, false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (busqueda.trim() === "") {
      setHasSearched(false);
      void cargarSocios("", 0, false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      void cargarSocios(busqueda, 0, false);
      setHasSearched(true);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [busqueda]);

  const cargarSocios = async (query: string, newOffset: number, append: boolean) => {
    // Prevenir llamadas múltiples simultáneas
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    if (!isMountedRef.current) return;
    
    if (newOffset === 0) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    
    if (query !== undefined && newOffset === 0) {
      setHasSearched(true);
    }
    
    try {
      const response = await mobileApi.buscarSocios(query, newOffset, PAGE_SIZE);
      
      if (!isMountedRef.current) return;
      
      if (append) {
        // Filtrar duplicados por ID
        setSocios(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newItems = response.data.filter((s: SocioItem) => !existingIds.has(s.id));
          return [...prev, ...newItems];
        });
      } else {
        setSocios(response.data);
      }
      
      setHasMore(response.hasMore);
      setTotalCount(response.total);
      setOffset(newOffset);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : "Error al cargar socios");
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      cargarSocios(busqueda, offset + PAGE_SIZE, true);
    }
  }, [loadingMore, hasMore, loading, busqueda, offset]);

  const getInitials = (nombre: string, apellido: string) => {
    return (nombre[0] + apellido[0]).toUpperCase();
  };

  const getEstadoDeuda = (socio: SocioItem): EstadoDeuda => {
    const cuotasPendientes = Number(socio.cantidadCuotasPendientes ?? 0);

    if (cuotasPendientes > 4 || socio.estado === "MOROSO") {
      return "MOROSO";
    }

    if (cuotasPendientes > 0) {
      return "CON_DEUDA";
    }

    return "AL_DIA";
  };

  const renderSocioCard = useCallback(({ item: socio }: { item: SocioItem }) => {
    const cuotasPendientes = Number(socio.cantidadCuotasPendientes ?? 0);
    const estadoDeuda = getEstadoDeuda(socio);
    const estadoLabel =
      estadoDeuda === "AL_DIA"
        ? "Al día"
        : estadoDeuda === "CON_DEUDA"
          ? `${cuotasPendientes} cuota${cuotasPendientes !== 1 ? "s" : ""} pendiente${cuotasPendientes !== 1 ? "s" : ""}`
          : "Moroso";

    const cardTone =
      estadoDeuda === "AL_DIA"
        ? "border-green-500/35"
        : estadoDeuda === "CON_DEUDA"
          ? "border-orange-500/40"
          : "border-destructive/40";

    const indicatorTone =
      estadoDeuda === "AL_DIA"
        ? "bg-green-600"
        : estadoDeuda === "CON_DEUDA"
          ? "bg-orange-500"
          : "bg-destructive";

    const avatarTone =
      estadoDeuda === "AL_DIA"
        ? "bg-green-500/10 border-green-500/30"
        : estadoDeuda === "CON_DEUDA"
          ? "bg-orange-500/10 border-orange-500/30"
          : "bg-destructive/10 border-destructive/30";

    const avatarTextTone =
      estadoDeuda === "AL_DIA"
        ? "text-green-700"
        : estadoDeuda === "CON_DEUDA"
          ? "text-orange-700"
          : "text-destructive";

    const badgeTone =
      estadoDeuda === "AL_DIA"
        ? "bg-green-500/10 border border-green-500/30 text-green-700"
        : estadoDeuda === "CON_DEUDA"
          ? "bg-orange-500/10 border border-orange-500/30 text-orange-700"
          : "bg-destructive/10 border border-destructive/30 text-destructive";

    return (
      <View className="mb-3 px-6">
        <Pressable
          onPress={() => router.push(`/cobradora/pago?socioId=${socio.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${socio.apellido}, ${socio.nombre}. DNI: ${socio.dni ?? "—"}. Estado: ${estadoLabel}. ${socio.grupoFamiliar ? `Grupo: ${socio.grupoFamiliar.nombre}.` : ""} Toca para cobrar`}
          accessibilityHint="Navega a la pantalla de cobro"
        >
          <View className={`relative overflow-hidden bg-card rounded-3xl p-4 border shadow-sm flex-row items-center gap-4 ${cardTone}`}>
          <View
            className={`absolute left-0 top-0 bottom-0 w-1.5 ${indicatorTone}`}
            accessibilityElementsHidden
          />
          {/* Avatar Circle */}
          <View 
            className={`w-12 h-12 rounded-full items-center justify-center border ${avatarTone}`}
            accessibilityElementsHidden
          >
            <Text className={`font-bold text-xs tracking-wider ${avatarTextTone}`}>
              {getInitials(socio.nombre, socio.apellido)}
            </Text>
          </View>

          {/* Info */}
          <View className="flex-1 justify-center gap-1.5">
            <Text className="text-foreground font-bold text-base leading-tight">
              {socio.apellido}, {socio.nombre}
            </Text>
            
            <View className="flex-row items-center gap-2" accessibilityElementsHidden>
              <Text className="text-muted-foreground text-xs font-medium">
                DNI: {socio.dni ?? "—"}
              </Text>
              <View className={`px-2 py-0.5 rounded-md ${badgeTone}`}>
                <Text className="text-[10px] font-bold uppercase tracking-wide">
                  {estadoLabel}
                </Text>
              </View>
            </View>

            {socio.grupoFamiliar && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/cobradora/grupo-familiar/${socio.grupoFamiliar!.id}`);
                }}
                className="self-start bg-secondary/70 px-2 py-0.5 rounded-md flex-row items-center gap-1 border border-border/50"
                accessibilityRole="button"
                accessibilityLabel={`Ver grupo familiar ${socio.grupoFamiliar.nombre}`}
                accessibilityHint="Navega a los detalles del grupo familiar"
              >
                <Users size={10} color="hsl(var(--secondary-foreground))" className="opacity-70" />
                <Text className="text-secondary-foreground text-[10px] font-semibold">
                  {socio.grupoFamiliar.nombre}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Action Button */}
          <View 
            className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20"
            accessibilityElementsHidden
          >
            <Text className="text-primary text-xs font-bold">
              Cobrar
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
    );
  }, [router]);

  const renderListHeader = useCallback(() => (
    <>
      {/* Header Hero Area */}
      <View 
        className="bg-primary rounded-b-[40px] px-6 shadow-sm"
        style={{ paddingTop: Math.max(insets.top + 20, 40), paddingBottom: 56 }}
      >
        <View className="flex-row items-center gap-3 mb-5">
          <ScreenBackButton onPress={() => router.replace("/")} tone="light" />
          <View className="flex-1" />
          <Pressable
            className="flex-row items-center gap-2 bg-primary-foreground/20 px-4 py-3 rounded-2xl border border-primary-foreground/30"
            onPress={() => router.push("/cobradora/grupos-familiares")}
            accessibilityRole="button"
            accessibilityLabel="Ver grupos familiares - Cobra a toda la familia junta"
            accessibilityHint="Navega a la lista de grupos familiares para cobrar a varias personas de una familia"
          >
            <Users size={18} color="white" />
            <Text className="text-primary-foreground font-bold text-sm">Familias</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-primary-foreground/80 font-medium text-sm mb-1 uppercase tracking-wider">
              Bienvenido de nuevo
            </Text>
            <Text 
              className="text-primary-foreground font-bold text-3xl tracking-tight" 
              numberOfLines={1}
              accessibilityLabel={`Cobrador: ${cobradorNombre || "Cobrador"}`}
            >
              {cobradorNombre || "Cobrador"}
            </Text>
          </View>
          <View 
            className="bg-primary-foreground/20 p-1.5 rounded-full border border-primary-foreground/30 shadow-sm"
            accessibilityElementsHidden
          >
            <Avatar
              initials={cobradorNombre.slice(0, 2).toUpperCase() || "CO"}
              size="sm"
              className="bg-background"
              accessibilityLabel={`Avatar de ${cobradorNombre || "Cobrador"}`}
            />
          </View>
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
            placeholder="Escribí nombre, apellido o DNI..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={busqueda}
            onChangeText={setBusqueda}
            returnKeyType="done"
            accessibilityLabel="Buscar socio"
            accessibilityHint="La búsqueda se hace automáticamente mientras escribís"
          />
          {/* Indicador de búsqueda en progreso */}
          {loading && (
            <View className="h-10 w-10 rounded-full items-center justify-center ml-2">
              <Spinner size="sm" />
            </View>
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
        {!loading && socios.length > 0 && (
          <View 
            className="flex-row items-center justify-between mb-2"
            accessibilityRole="header"
          >
            <Text className="text-foreground text-xl font-bold tracking-tight">Resultados</Text>
                <View 
                  className="bg-secondary px-3 py-1 rounded-full"
                  accessibilityLabel={`${totalCount} socio${totalCount !== 1 ? "s" : ""} encontrado${totalCount !== 1 ? "s" : ""}`}
                >
                  <Text className="text-secondary-foreground font-semibold text-xs">
                    {totalCount} socio{totalCount !== 1 ? "s" : ""}
                  </Text>
                </View>
          </View>
        )}

        {/* Empty State */}
        {!loading && socios.length === 0 && !error && busqueda.length > 0 && (
          <View 
            className="items-center justify-center py-12 opacity-80"
            accessibilityRole="text"
            accessibilityLabel={`Sin resultados. No se encontraron socios que coincidan con ${busqueda}`}
          >
            <Search size={48} color="hsl(var(--muted-foreground))" className="mb-5 opacity-40" />
            <Text className="text-foreground font-bold text-lg text-center mb-1">Sin resultados</Text>
            <Text className="text-muted-foreground text-sm text-center px-4">
              No se encontraron socios que coincidan con "{busqueda}". Intenta con otro término.
            </Text>
          </View>
        )}
      </View>
    </>
  ), [insets, router, cobradorNombre, busqueda, loading, error, socios.length]);

  const renderListFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View className="py-6 items-center justify-center px-6">
          <Spinner size="lg" />
        </View>
      );
    }
    
    if (!hasMore && socios.length > 0 && !loading && !loadingMore) {
      return (
        <View className="py-4 items-center px-6">
          <Text className="text-muted-foreground text-sm">No hay más socios</Text>
        </View>
      );
    }
    
    return null;
  }, [loadingMore, hasMore, socios.length, loading]);

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={socios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSocioCard}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
