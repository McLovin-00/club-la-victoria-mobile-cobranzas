import { View, Text, Pressable } from "react-native";
import { CheckCircle, Check } from "lucide-react-native";
import { Badge } from "../ui/badge";
import type { MiembroGrupo } from "../../lib/types";
import { cn } from "../../lib/utils";


interface MiembroGrupoItemProps {
  miembro: MiembroGrupo;
  onPress: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export function MiembroGrupoItem({ miembro, onPress, selectable, selected, onSelect }: MiembroGrupoItemProps) {
  const tieneDeuda = miembro.cantidadCuotasPendientes > 0;

  const getInitials = (nombre: string, apellido: string) => {
    return (nombre[0] + apellido[0]).toUpperCase();
  };

  // Build accessibility label
  const accessibilityLabel = [
    `${miembro.apellido}, ${miembro.nombre}`,
    `DNI: ${miembro.dni ?? "-"}`,
    miembro.telefono ? `Teléfono: ${miembro.telefono}` : null,
    tieneDeuda
      ? `${miembro.cantidadCuotasPendientes} cuota${miembro.cantidadCuotasPendientes !== 1 ? "s" : ""} pendiente${miembro.cantidadCuotasPendientes !== 1 ? "s" : ""}, total $${miembro.totalPendiente.toLocaleString("es-AR")}`
      : "Sin deuda",
  ].filter(Boolean).join(". ");

  return (
    <View className="flex-row items-center w-full gap-2">
      {selectable && onSelect && (
        <Pressable
          onPress={onSelect}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          accessibilityLabel={`Seleccionar a ${miembro.nombre} ${miembro.apellido}`}
          className="p-2"
        >
          <View
            className={cn(
              "w-6 h-6 rounded-full border-2 items-center justify-center",
              selected ? "bg-primary border-primary" : "border-border"
            )}
          >
            {selected && <Check size={14} color="#ffffff" />}
          </View>
        </Pressable>
      )}
      <Pressable
        className="flex-1"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={tieneDeuda ? "Toca para registrar un cobro individual" : "Toca para ver detalles"}
      >
        <View
          className={cn(
            "bg-card rounded-3xl p-4 border shadow-sm flex-row items-center gap-4",
            selectable && selected ? "border-primary bg-primary/5" : "border-border/40"
          )}
        >
          {/* Avatar */}
        <View
          className={`w-12 h-12 rounded-full items-center justify-center border ${
            tieneDeuda ? "bg-primary/10 border-primary/20" : "bg-green-500/10 border-green-500/20"
          }`}
          accessibilityElementsHidden
        >
          <Text
            className={`font-semibold ${
              tieneDeuda ? "text-primary" : "text-green-600"
            }`}
            aria-hidden
          >
            {getInitials(miembro.nombre, miembro.apellido)}
          </Text>
        </View>

        {/* Contenido */}
        <View className="flex-1 justify-center gap-1.5">
          <Text className="text-foreground font-bold text-base leading-tight">
            {miembro.apellido}, {miembro.nombre}
          </Text>
          <View className="flex-row items-center gap-2" accessibilityElementsHidden>
            <Text className="text-muted-foreground text-xs font-medium">
              DNI: {miembro.dni ?? "—"}
            </Text>
            {miembro.telefono && (
              <>
                <View className="w-1 h-1 rounded-full bg-border" />
                <Text className="text-muted-foreground text-xs font-medium">
                  Tel: {miembro.telefono}
                </Text>
              </>
            )}
          </View>

          {tieneDeuda ? (
            <View className="flex-row items-center gap-2 mt-0.5" accessibilityElementsHidden>
              <Badge variant="warning" size="sm">
                {miembro.cantidadCuotasPendientes} cuota
                {miembro.cantidadCuotasPendientes !== 1 ? "s" : ""}
              </Badge>
              <Text className="text-destructive font-semibold text-sm">
                ${miembro.totalPendiente.toLocaleString("es-AR")}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1 mt-0.5" accessibilityElementsHidden>
              <CheckCircle size={14} color="hsl(142, 76%, 36%)" />
              <Text className="text-green-600 text-xs font-medium">
                Sin deuda
              </Text>
            </View>
          )}
        </View>

        {/* Botón cobrar (solo si tiene deuda) */}
        {tieneDeuda ? (
          <View className="bg-primary/10 px-3 py-2 rounded-full border border-primary/20" accessibilityElementsHidden>
            <Text className="text-primary text-[10px] font-bold tracking-widest uppercase">Cobrar</Text>
          </View>
        ) : (
          <View className="bg-green-500/10 px-3 py-2 rounded-full border border-green-500/20" accessibilityElementsHidden>
            <Text className="text-green-600 text-[10px] font-bold tracking-widest uppercase">Ver</Text>
          </View>
        )}
</View>
    </Pressable>
    </View>
);

}
