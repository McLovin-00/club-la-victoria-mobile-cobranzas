import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Constants from "expo-constants";
import {
  AlertCircle,
  ChevronRight,
  ClipboardList,
  CreditCard,
} from "lucide-react-native";
import { mobileApi } from "../lib/api";
import { getBinding, getOrCreateInstallationId, setBinding, type StoredBinding } from "../lib/storage";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Spinner } from "../components/ui/spinner";
import { cn } from "../lib/utils";

const BRAND_PRIMARY = "hsl(146, 68%, 24%)";
const MUTED_ICON = "hsl(150, 8%, 37%)";

interface ActionRowProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  tone?: "primary" | "secondary";
  disabled?: boolean;
  accessibilityHint?: string;
}

function ActionRow({
  title,
  subtitle,
  icon,
  onPress,
  tone = "secondary",
  disabled = false,
  accessibilityHint,
}: ActionRowProps) {
  const isPrimary = tone === "primary" && !disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      className={cn(
        "w-full rounded-2xl px-4 flex-row items-center gap-3.5",
        isPrimary
          ? "min-h-[68px] py-4 bg-primary shadow-card active:opacity-90"
          : disabled
            ? "min-h-[64px] py-3.5 bg-card border border-border opacity-60"
            : "min-h-[64px] py-3.5 bg-card border border-input active:bg-muted",
      )}
    >
      <View
        className={cn(
          "w-10 h-10 shrink-0 rounded-xl items-center justify-center",
          isPrimary ? "bg-white/15" : "bg-primary/10",
        )}
        accessibilityElementsHidden
        aria-hidden
      >
        {icon}
      </View>

      <View className="flex-1 gap-0.5">
        <Text
          className={cn(
            "tracking-tight",
            isPrimary
              ? "text-primary-foreground text-lg font-bold"
              : "text-foreground text-base font-semibold",
          )}
        >
          {title}
        </Text>
        <Text
          className={cn(
            "text-xs leading-4",
            isPrimary ? "text-primary-foreground/90" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </Text>
      </View>

      <View accessibilityElementsHidden aria-hidden>
        <ChevronRight size={18} color={isPrimary ? "#ffffff" : MUTED_ICON} />
      </View>
    </Pressable>
  );
}

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [binding, setCurrentBinding] = useState<StoredBinding | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBinding = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const current = await getBinding();
      if (current) {
        setCurrentBinding(current);
        return;
      }

      const activos = (await mobileApi.getCobradoresActivos()).filter((cobrador) => cobrador.activo);
      if (activos.length !== 1) {
        setLoadError(activos.length === 0
          ? "No hay una cobradora activa. Consultá con el club."
          : "Hay más de una cobradora activa. Consultá con el club.");
        return;
      }

      const [cobrador] = activos;
      const installationId = await getOrCreateInstallationId();
      const binding = { installationId, cobradorId: cobrador.id, cobradorNombre: cobrador.nombre };
      await mobileApi.vincularDispositivo({ installationId, cobradorId: cobrador.id });
      await setBinding(binding);
      setCurrentBinding(binding);
    } catch {
      setLoadError("No se pudieron preparar las cobranzas. Revisá la conexión y volvé a intentar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBinding();
    }, [loadBinding]),
  );

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background p-6 gap-3"
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando cobranzas"
      >
        <Spinner size="lg" accessibilityLabel="Cargando cobranzas" />
        <Text className="text-muted-foreground text-sm">Cargando...</Text>
      </View>
    );
  }

  const hasBinding = !!binding;
  const cobradorDisplay =
    binding?.cobradorNombre?.trim() || (binding ? `Cobrador #${binding.cobradorId}` : "");

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Header — mismo eje horizontal (px-6 + max-w-md) que el cuerpo */}
        <View
          className="bg-primary px-6 rounded-b-[32px] md:rounded-b-none"
          style={{ paddingTop: Math.max(insets.top + 20, 32), paddingBottom: 64 }}
        >
          <View className="w-full max-w-md mx-auto gap-1.5">
            <Text
              className="text-primary-foreground text-3xl font-bold tracking-tight"
              accessibilityRole="header"
            >
              Club La Victoria
            </Text>
            <Text className="text-primary-foreground/90 text-base">
              Cobranzas de socios
            </Text>
          </View>
        </View>

        {/* Body — idéntico contenedor px-6 + max-w-md para alineación exacta de 0px */}
        <View className="px-6 -mt-10 flex-1">
          <View className="w-full max-w-md mx-auto flex-1 gap-5">
            {loadError && (
              <View
                className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 gap-3"
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <View className="flex-row items-center gap-2.5">
                  <AlertCircle size={18} color="hsl(0, 72%, 43%)" />
                  <Text className="text-destructive text-sm font-medium flex-1">
                    {loadError}
                  </Text>
                </View>
                <Button variant="outline" size="sm" onPress={() => void loadBinding()}>
                  Reintentar
                </Button>
              </View>
            )}

            {/* Tarjeta de sesión y escudo institucional */}
            <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-elevated">
              <CardContent className="p-5">
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-1 gap-1">
                    {hasBinding ? (
                      <>
                        <Text
                          className="text-foreground text-xl font-bold tracking-tight"
                          accessibilityRole="header"
                        >
                          {cobradorDisplay}
                        </Text>
                        <Text className="text-muted-foreground text-sm">
                          Cobradora activa
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text
                          className="text-foreground text-xl font-bold tracking-tight"
                          accessibilityRole="header"
                        >
                          Cobranzas no disponibles
                        </Text>
                        <Text className="text-muted-foreground text-sm leading-5">
                          Cuando las cobranzas estén disponibles, vas a poder registrar y consultar cobros desde acá.
                        </Text>
                      </>
                    )}
                  </View>

                  <View className="w-[66px] h-[80px] shrink-0 overflow-hidden rounded-2xl bg-white border border-border/70 items-center justify-center p-1.5">
                    <Image
                      source={require("../assets/logo.webp")}
                      resizeMode="contain"
                      style={{ width: 52, height: 66 }}
                      accessibilityLabel="Escudo Club La Victoria"
                    />
                  </View>
                </View>

                <View className="border-t border-border/70 mt-4 pt-3 flex-row items-center justify-between gap-3">
                  <Badge
                    variant={hasBinding ? "success" : "warning"}
                  >
                    {hasBinding ? "Listo para cobrar" : "No disponible"}
                  </Badge>
                </View>
              </CardContent>
            </Card>

            {/* Menú principal — jerarquía adaptada al estado de configuración */}
            <View className="gap-3">
              {hasBinding && (
                <>
                  <ActionRow
                    tone="primary"
                    title="Cobranzas"
                    subtitle="Buscar socio o familia y registrar pago"
                    icon={<CreditCard size={20} color="#ffffff" />}
                    onPress={() => router.push("/cobradora/home")}
                    accessibilityHint="Abre la pantalla principal de cobranzas"
                  />
                  <ActionRow
                    title="Mis Cobranzas"
                    subtitle="Ver cobros registrados y totales"
                    icon={<ClipboardList size={20} color={BRAND_PRIMARY} />}
                    onPress={() => router.push("/cobradora/mis-cobranzas")}
                    accessibilityHint="Abre el historial de cobranzas"
                  />
                </>
              )}
            </View>

            {/* Version anclada al pie */}
            <Text className="text-center text-muted-foreground text-xs mt-auto pt-6">
              v{Constants.expoConfig?.version ?? "1.0.0"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
