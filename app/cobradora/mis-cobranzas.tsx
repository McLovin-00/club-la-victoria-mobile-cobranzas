import { useState } from "react";
import { Text, View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar, Search, Clipboard, DollarSign, TrendingUp, User, CreditCard, Receipt, ChevronRight } from "lucide-react-native";
import { ScreenBackButton } from "../../components/ui/screen-back-button";
import { Spinner } from "../../components/ui/spinner";
import { DatePicker } from "../../components/ui/date-picker";
import { Modal } from "../../components/ui/modal";
import { mobileApi } from "../../lib/api";
import { getBinding } from "../../lib/storage";

type OperacionCompleta = NonNullable<Awaited<ReturnType<typeof mobileApi.misCobranzas>>['operaciones'][number]>;

interface ReporteData {
  totalCobrado: number;
  operaciones: OperacionCompleta[];
}

export default function MisCobranzasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [desde, setDesde] = useState(new Date().toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReporteData | null>(null);
  const [hasConsulted, setHasConsulted] = useState(false);
  const [selectedOp, setSelectedOp] = useState<OperacionCompleta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const consultar = async () => {
    setError(null);
    setLoading(true);
    setHasConsulted(true);
    try {
      const binding = await getBinding();
      if (!binding) {
        throw new Error("No hay cobrador vinculado en este dispositivo");
      }
      const result = await mobileApi.misCobranzas(
        binding.cobradorId,
        new Date(`${desde}T00:00:00.000Z`).toISOString(),
        new Date(`${hasta}T23:59:59.999Z`).toISOString(),
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error consultando cobranzas");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    } else {
      return date.toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  const openDetail = (op: OperacionCompleta) => {
    setSelectedOp(op);
    setModalVisible(true);
  };

  const closeDetail = () => {
    setModalVisible(false);
    setSelectedOp(null);
  };

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
              Reporte
            </Text>
            <Text className="text-primary-foreground font-bold text-3xl tracking-tight">
              Mis Cobranzas
            </Text>
          </View>
        </View>

        {/* Floating Date Picker */}
        <View className="-mt-8 px-6 z-10">
          <View className="bg-card rounded-[24px] p-4 shadow-elevated border border-border/40">
            <View className="flex-row gap-3 mb-4">

              <View className="flex-1 gap-1">
                <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Desde</Text>
                <DatePicker
                  value={desde}
                  onChange={setDesde}
                  placeholder="DD-MM-AAAA"
                />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Hasta</Text>
                <DatePicker
                  value={hasta}
                  onChange={setHasta}
                  placeholder="DD-MM-AAAA"
                />
              </View>
            </View>

            <Pressable
              className={`h-12 rounded-2xl items-center justify-center bg-primary shadow-soft ${
                loading ? "opacity-50" : "opacity-100"
              }`}
              onPress={() => void consultar()}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Consultar cobranzas"
              accessibilityHint="Busca las cobranzas realizadas en el período seleccionado"
              accessibilityState={{ disabled: loading }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Search size={18} color="white" />
                  <Text className="text-primary-foreground font-bold text-sm">Consultar</Text>
                </View>
              )}
            </Pressable>
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

          {/* Total destacado */}
          {data && !loading && (
            <View
              className="bg-card rounded-3xl p-5 border border-border/40 shadow-sm"
              accessibilityRole="summary"
              accessibilityLabel={`Total cobrado en el período: $${data.totalCobrado.toLocaleString("es-AR")}`}
            >
              <View className="flex-row items-center gap-4">
                <View
                  className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center border border-primary/20"
                  accessibilityElementsHidden
                >
                  <DollarSign size={24} color="hsl(var(--primary))" />
                </View>
                <View className="flex-1">
                  <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total cobrado</Text>
                  <Text
                    className="text-foreground font-bold text-3xl tracking-tight"
                    accessibilityLabel={`$${data.totalCobrado.toLocaleString("es-AR")}`}
                  >
                    ${data.totalCobrado.toLocaleString("es-AR")}
                  </Text>
                </View>
                <TrendingUp size={24} color="hsl(var(--primary))" accessibilityElementsHidden />
              </View>
            </View>
          )}

          {/* Loading state */}
          {loading && (
            <View
              className="items-center py-8"
              accessibilityRole="progressbar"
              accessibilityLabel="Consultando cobranzas"
            >
              <Spinner size="lg" />
              <Text className="text-muted-foreground mt-3">Consultando cobranzas...</Text>
            </View>
          )}

          {/* Results Header */}
          {data && !loading && data.operaciones.length > 0 && (
            <View
              className="flex-row items-center justify-between mb-2"
              accessibilityRole="header"
            >
              <Text className="text-foreground text-xl font-bold tracking-tight">Operaciones</Text>
              <View
                className="bg-secondary px-3 py-1 rounded-full"
                accessibilityLabel={`${data.operaciones.length} operación${data.operaciones.length !== 1 ? "es" : ""}`}
              >
                <Text className="text-secondary-foreground font-semibold text-xs">
                  {data.operaciones.length} operación{data.operaciones.length !== 1 ? "es" : ""}
                </Text>
              </View>
            </View>
          )}

          {/* Operations list */}
          {data && !loading && data.operaciones.length > 0 && (
            <View className="gap-3">
              {data.operaciones.map((op) => (
                <Pressable
                  key={op.id}
                  className="bg-card rounded-3xl p-4 border border-border/40 shadow-sm flex-row items-center gap-4 active:opacity-80 active:scale-[0.98]"
                  onPress={() => openDetail(op)}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDate(op.fechaHoraServidor)} a las ${formatTime(op.fechaHoraServidor)}, operación número ${op.id}, monto $${op.total.toLocaleString("es-AR")}. Toca para ver detalle.`}
                >
                  {/* Avatar Circle */}
                  <View
                    className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center border border-primary/20"
                    accessibilityElementsHidden
                  >
                    <DollarSign size={20} color="hsl(var(--primary))" />
                  </View>

                  {/* Info */}
                  <View className="flex-1 justify-center gap-1.5">
                    <Text className="text-foreground font-bold text-base leading-tight">
                      {formatDate(op.fechaHoraServidor)}
                    </Text>
                    <View className="flex-row items-center gap-2" accessibilityElementsHidden>
                      <Text className="text-muted-foreground text-xs font-medium">
                        {formatTime(op.fechaHoraServidor)}
                      </Text>
                      <View className="w-1 h-1 rounded-full bg-border" />
                      <Text className="text-muted-foreground text-xs font-medium">
                        Op #{op.id}
                      </Text>
                    </View>
                  </View>

                  {/* Amount pill */}
                  <View className="bg-primary/10 px-3 py-2 rounded-full border border-primary/20">
                    <Text className="text-primary text-xs font-bold">
                      ${op.total.toLocaleString("es-AR")}
                    </Text>
                  </View>

                  {/* Chevron */}
                  <ChevronRight size={18} color="hsl(var(--muted-foreground))" />
                </Pressable>
              ))}
            </View>
          )}

          {/* Empty state - no operations */}
          {data && !loading && data.operaciones.length === 0 && (
            <View
              className="items-center justify-center py-12 opacity-80"
              accessibilityRole="text"
              accessibilityLabel="Sin cobranzas en el período"
            >
              <Clipboard size={48} color="hsl(var(--muted-foreground))" className="mb-5 opacity-40" />
              <Text className="text-foreground font-bold text-lg text-center mb-1">Sin cobranzas</Text>
              <Text className="text-muted-foreground text-sm text-center px-4">
                No hay cobranzas registradas en este período
              </Text>
            </View>
          )}

          {/* Initial state - no query yet */}
          {!hasConsulted && !loading && (
            <View
              className="items-center justify-center py-12 opacity-80"
              accessibilityRole="text"
            >
              <Calendar size={48} color="hsl(var(--muted-foreground))" className="mb-5 opacity-40" />
              <Text className="text-foreground font-bold text-lg text-center mb-1">Selecciona un período</Text>
              <Text className="text-muted-foreground text-sm text-center px-4">
                Elige las fechas y presiona "Consultar" para ver tus cobranzas
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        onClose={closeDetail}
        title="Detalle del Cobro"
      >
        {selectedOp && (
          <View className="gap-4">
            {/* Header con fecha y total */}
            <View className="flex-row items-center justify-between pb-4 border-b border-border/40">
              <View>
                <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
                  {formatDate(selectedOp.fechaHoraServidor)} • {formatTime(selectedOp.fechaHoraServidor)}
                </Text>
                <Text className="text-foreground font-bold text-2xl">
                  ${selectedOp.total.toLocaleString("es-AR")}
                </Text>
              </View>
              <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                <DollarSign size={24} color="hsl(var(--primary))" />
              </View>
            </View>

            {/* Info del socio si existe */}
            {selectedOp.socio && (
              <View className="flex-row items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <User size={18} color="hsl(var(--primary))" />
                </View>
                <View className="flex-1">
                  <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Socio</Text>
                  <Text className="text-foreground font-semibold">
                    {selectedOp.socio.nombre} {selectedOp.socio.apellido}
                  </Text>
                </View>
              </View>
            )}

            {/* Método de pago si existe */}
            {selectedOp.metodoPago && (
              <View className="flex-row items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <CreditCard size={18} color="hsl(var(--primary))" />
                </View>
                <View className="flex-1">
                  <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Método de pago</Text>
                  <Text className="text-foreground font-semibold">
                    {selectedOp.metodoPago.nombre}
                  </Text>
                </View>
              </View>
            )}

            {/* Líneas del cobro */}
            {selectedOp.lineas && selectedOp.lineas.length > 0 && (
              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <Receipt size={16} color="hsl(var(--muted-foreground))" />
                  <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Detalle ({selectedOp.lineas.length} {selectedOp.lineas.length === 1 ? 'ítem' : 'ítems'})
                  </Text>
                </View>

                <View className="gap-2">
                  {selectedOp.lineas.map((linea, idx) => (
                    <View
                      key={linea.id || idx}
                      className="flex-row items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/30"
                    >
                      <View className="flex-1 flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                          <Text className="text-primary text-xs font-bold">
                            {idx + 1}
                          </Text>
                        </View>
                        <View className="flex-1">
                          {linea.tipoLinea === 'CUOTA' && linea.cuota ? (
                            <Text className="text-foreground font-medium text-sm">
                              Cuota {linea.cuota.periodo}
                            </Text>
                          ) : linea.tipoLinea === 'CONCEPTO' ? (
                            <View>
                              <Text className="text-foreground font-medium text-sm">
                                {linea.concepto || 'Concepto'}
                              </Text>
                              {linea.descripcion && (
                                <Text className="text-muted-foreground text-xs mt-0.5">
                                  {linea.descripcion}
                                </Text>
                              )}
                            </View>
                          ) : (
                            <Text className="text-foreground font-medium text-sm">
                              Ítem #{idx + 1}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="bg-primary/10 px-3 py-1.5 rounded-full">
                        <Text className="text-primary text-xs font-bold">
                          ${linea.monto.toLocaleString("es-AR")}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Total al final */}
                <View className="flex-row items-center justify-between pt-3 mt-2 border-t border-border/50">
                  <Text className="text-muted-foreground text-sm font-medium">Total</Text>
                  <Text className="text-primary font-bold text-lg">
                    ${selectedOp.total.toLocaleString("es-AR")}
                  </Text>
                </View>
              </View>
            )}

            {/* Si no hay líneas */}
            {(!selectedOp.lineas || selectedOp.lineas.length === 0) && (
              <View className="items-center py-6 opacity-60">
                <Text className="text-muted-foreground text-sm">
                  Sin detalle disponible
                </Text>
              </View>
            )}
          </View>
        )}
      </Modal>
    </View>
  );
}
