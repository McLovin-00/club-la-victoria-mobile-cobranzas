import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, RefreshCw, X } from 'lucide-react-native';
import { useUpdates } from '../../hooks/useUpdates';

/**
 * Modal que muestra un aviso cuando hay una actualización disponible.
 *
 * Flujo:
 * 1. Detecta actualización disponible → Muestra modal "Nueva versión disponible"
 * 2. Usuario presiona "Actualizar" → Descarga la actualización
 * 3. Descarga completa → Muestra "Reiniciar para aplicar"
 * 4. Usuario presiona "Reiniciar" → Recarga la app
 *
 * El usuario puede descartar el modal, pero volverá a aparecer
 * la próxima vez que se abra la app si sigue habiendo actualización.
 */
export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const { isUpdateAvailable, isDownloading, downloadUpdate, reloadApp } = useUpdates();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const visible = !__DEV__ && isUpdateAvailable && !isDismissed;

  const handleDownload = async () => {
    await downloadUpdate();
    setIsDownloaded(true);
  };

  const handleReload = async () => {
    await reloadApp();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View 
        className="flex-1 bg-black/60 items-center justify-center px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border/50">
          {/* Header con botones cerrar */}
          <View className="flex-row items-start justify-between mb-4">
            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
              {isDownloaded ? (
                <RefreshCw size={20} color="hsl(var(--primary))" />
              ) : (
                <Download size={20} color="hsl(var(--primary))" />
              )}
            </View>
            <Pressable
              onPress={handleDismiss}
              className="w-8 h-8 rounded-full bg-muted/50 items-center justify-center"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color="hsl(var(--muted-foreground))" />
            </Pressable>
          </View>

          {/* Contenido */}
          <Text className="text-foreground font-bold text-xl mb-2">
            {isDownloaded ? 'Actualización lista' : 'Nueva versión disponible'}
          </Text>
          <Text className="text-muted-foreground text-base mb-6">
            {isDownloaded
              ? 'Reiniciá la app para aplicar los cambios y disfrutar de las mejoras.'
              : 'Hay una versión nueva con mejoras y correcciones. ¿Querés actualizar ahora?'}
          </Text>

          {/* Botones de acción */}
          <View className="gap-3">
            {!isDownloaded ? (
              <>
                <Pressable
                  onPress={handleDownload}
                  disabled={isDownloading}
                  className="flex-row items-center justify-center gap-2 bg-primary py-3.5 rounded-xl active:opacity-80"
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Download size={20} color="white" />
                      <Text className="text-primary-foreground font-semibold text-base">
                        Actualizar ahora
                      </Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleDismiss}
                  className="flex-row items-center justify-center py-3 rounded-xl active:opacity-70"
                >
                  <Text className="text-muted-foreground font-medium">
                    Más tarde
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleReload}
                className="flex-row items-center justify-center gap-2 bg-primary py-3.5 rounded-xl active:opacity-80"
              >
                <RefreshCw size={20} color="white" />
                <Text className="text-primary-foreground font-semibold text-base">
                  Reiniciar ahora
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
