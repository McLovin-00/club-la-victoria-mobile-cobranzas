import { ReactNode, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal as RNModal,
  ScrollView,
  Animated,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const safeWindowHeight = windowHeight > 0 ? windowHeight : 800;
  const maxSheetHeight = Math.min(
    Math.round(safeWindowHeight * 0.85),
    safeWindowHeight - insets.top - 24,
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    fadeAnim.setValue(0);
    slideAnim.setValue(160);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, visible]);

  if (!visible) return null;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdropWrapper, { opacity: fadeAnim }]}>
          <Pressable
            onPress={onClose}
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel="Cerrar fondo del detalle"
          />
        </Animated.View>

        {/* Bottom Sheet / Dialog */}
        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
          pointerEvents="box-none"
        >
          <View
            className="w-full max-w-lg mx-auto bg-card rounded-t-[28px] border border-border overflow-hidden"
            style={[styles.sheetSurface, { maxHeight: maxSheetHeight }]}
          >
            {/* Handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-border" />
            </View>

            {/* Header */}
            {title && (
              <View className="flex-row items-center justify-between px-6 py-3 border-b border-border/60 gap-3">
                <Text className="text-foreground font-bold text-xl tracking-tight flex-1">
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  className="w-10 h-10 rounded-full bg-muted items-center justify-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <X size={20} color="hsl(150, 15%, 25%)" />
                </Pressable>
              </View>
            )}

            {/* Scrollable Body */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 24, 19, 0.58)",
  },
  sheetContainer: {
    width: "100%",
  },
  sheetSurface: {
    backgroundColor: "#ffffff",
    shadowColor: "#14281c",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 16,
  },
  scroll: {
    flexGrow: 0,
  },
});
