import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { CreditCard, Users, ClipboardList } from "lucide-react-native";
import { getBinding } from "../lib/storage";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hasBinding, setHasBinding] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadBinding = async () => {
      const binding = await getBinding();
      setHasBinding(!!binding);
      setLoading(false);
    };

    void loadBinding();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-foreground">Cargando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          className="bg-primary rounded-b-[40px] px-6"
          style={{ paddingTop: Math.max(insets.top + 18, 36), paddingBottom: 72 }}
        >
          <Badge
            variant="secondary"
            className="self-start bg-primary-foreground/16 border border-primary-foreground/20 px-3 py-1"
          >
            Acceso principal
          </Badge>

          <View className="mt-5 gap-3">
            <Text className="text-primary-foreground text-4xl font-bold tracking-tight">
              Club La Victoria
            </Text>
            <Text className="text-primary-foreground/80 text-base leading-6 max-w-[320px]">
              Gestiona cobranzas y configuracion desde una portada mas clara, directa y agradable.
            </Text>
          </View>
        </View>

        <View className="px-6 -mt-10 gap-5">
          <Card className="overflow-hidden rounded-[28px] border-border/50 shadow-elevated">
            <CardContent className="pt-6 pb-6 px-5">
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 pr-2">
                  <Text className="text-foreground text-2xl font-bold tracking-tight">
                    Bienvenido
                  </Text>
                  <Text className="text-muted-foreground text-sm leading-5 mt-2">
                    Entra rapido a las acciones que mas usas y revisa el estado de tu acceso antes de salir a cobrar.
                  </Text>
                </View>

                <View className="w-24 h-24 rounded-[24px] bg-primary/10 border border-primary/15 items-center justify-center">
                  <Image
                    source={require("../assets/logo.webp")}
                    className="w-16 h-16"
                    style={{ resizeMode: "contain" }}
                  />
                </View>
              </View>

              <View className="flex-row flex-wrap gap-2 mt-5">
                <Badge
                  variant={hasBinding ? "success" : "warning"}
                  className="px-3 py-1.5"
                  accessibilityLabel={hasBinding ? "Dispositivo vinculado" : "Dispositivo sin vincular"}
                >
                  {hasBinding ? "Listo para cobrar" : "Falta configurar"}
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5 bg-secondary/40">
                  Inicio rapido
                </Badge>
              </View>
            </CardContent>
          </Card>

          <View className="gap-3">
            <Button
              variant="default"
              onPress={() => router.push("/cobradora/home")}
              disabled={!hasBinding}
              className="w-full min-h-[64px] rounded-[24px] border-2 border-primary-foreground/10 bg-primary shadow-elevated"
              textClass="text-lg font-bold tracking-tight"
              leftIcon={<CreditCard size={20} color="white" />}
              accessibilityHint={hasBinding ? "Abre la pantalla principal de cobranzas" : "Primero debes configurar el dispositivo"}
            >
              Cobranzas
            </Button>

            <Button
              variant="outline"
              onPress={() => router.push("/cobradora/mis-cobranzas")}
              disabled={!hasBinding}
              className="w-full min-h-[64px] rounded-[24px] border-2 border-primary/30 bg-card shadow-card"
              textClass="text-base font-bold"
              leftIcon={<ClipboardList size={20} color="hsl(var(--primary))" />}
              accessibilityHint={hasBinding ? "Abre el historial de cobranzas" : "Primero debes configurar el dispositivo"}
            >
              Mis Cobranzas
            </Button>

            <Button
              variant="outline"
              onPress={() => router.push("/cobradora/configuracion")}
              className="w-full min-h-[64px] rounded-[24px] border-2 border-primary/30 bg-card shadow-card"
              textClass="text-base font-bold"
              leftIcon={<Users size={20} color="hsl(var(--primary))" />}
            >
              Configuracion del cobrador
            </Button>
          </View>

          {/* Version */}
          <Text className="text-center text-muted-foreground/50 text-xs mt-6">
            v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
