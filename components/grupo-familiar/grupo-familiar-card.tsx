import { View, Text, Pressable } from "react-native";
import { Users, CheckCircle } from "lucide-react-native";
import { Badge } from "../ui/badge";
import type { GrupoFamiliar } from "../../lib/types";

interface GrupoFamiliarCardProps {
  grupo: GrupoFamiliar;
  onPress: () => void;
}

export function GrupoFamiliarCard({ grupo, onPress }: GrupoFamiliarCardProps) {
  const tieneDeuda = grupo.miembrosConDeuda > 0;

  // Build accessibility label
  const accessibilityLabel = [
    grupo.nombre,
    grupo.descripcion,
    `${grupo.cantidadMiembros} miembros`,
    tieneDeuda
      ? `${grupo.miembrosConDeuda} con deuda, total $${grupo.totalPendiente.toLocaleString("es-AR")}`
      : "Al día",
  ].filter(Boolean).join(". ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Toca para ver detalles del grupo familiar"
    >
      <View className="bg-card rounded-3xl p-4 border border-border/40 shadow-sm flex-row items-center gap-4">
        {/* Icono */}
        <View
          className={`w-12 h-12 rounded-full items-center justify-center border ${
            tieneDeuda ? "bg-primary/10 border-primary/20" : "bg-green-500/10 border-green-500/20"
          }`}
          accessibilityElementsHidden
        >
          <Users
            size={24}
            color={tieneDeuda ? "hsl(180, 70%, 40%)" : "hsl(142, 76%, 36%)"}
          />
        </View>

        {/* Contenido */}
        <View className="flex-1 justify-center gap-1.5">
          <Text className="text-foreground font-bold text-base leading-tight">
            {grupo.nombre}
          </Text>
          {grupo.descripcion ? (
            <Text className="text-muted-foreground text-xs font-medium" numberOfLines={1}>
              {grupo.descripcion}
            </Text>
          ) : null}

          {/* Badges de información */}
          <View className="flex-row items-center gap-2 mt-0.5" accessibilityElementsHidden>
            <Badge variant="secondary" size="sm">
              <Users size={12} color="hsl(var(--secondary-foreground))" />
              <Text className="ml-1">{grupo.cantidadMiembros}</Text>
            </Badge>

            {tieneDeuda ? (
              <>
                <Badge variant="warning" size="sm">
                  {grupo.miembrosConDeuda} con deuda
                </Badge>
                <Text className="text-destructive font-semibold text-sm">
                  ${grupo.totalPendiente.toLocaleString("es-AR")}
                </Text>
              </>
            ) : (
              <Badge variant="success" size="sm">
                <CheckCircle size={12} color="white" />
                <Text className="ml-1">Al día</Text>
              </Badge>
            )}
          </View>
        </View>

        {/* Flecha */}
        <View className="bg-primary/10 px-3 py-2 rounded-full border border-primary/20" accessibilityElementsHidden>
          <Text className="text-primary text-[10px] font-bold tracking-widest uppercase">Ver</Text>
        </View>
      </View>
    </Pressable>
  );
}
