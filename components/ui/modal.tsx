import { ReactNode, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal as RNModal,
  ScrollView,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.min(SCREEN_HEIGHT * 0.8, SCREEN_HEIGHT - insets.top - 16);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    fadeAnim.setValue(0);
    slideAnim.setValue(sheetHeight);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, sheetHeight, slideAnim, visible]);

  if (!visible) return null;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          className="flex-1 bg-black/60"
          style={{
            opacity: fadeAnim,
          }}
        />
      </TouchableWithoutFeedback>

      {/* Modal Content */}
      <View
        className="absolute inset-x-0 bottom-0"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Animated.View
          className="bg-card rounded-t-[32px] shadow-2xl border border-border/50"
          style={{
            transform: [{ translateY: slideAnim }],
            height: sheetHeight,
          }}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>

          {/* Header */}
          {title && (
            <View className="flex-row items-center justify-between px-6 pb-3 border-b border-border/50">
              <Text className="text-foreground font-bold text-xl tracking-tight flex-1">
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-muted/50 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <X size={20} color="hsl(var(--muted-foreground))" />
              </Pressable>
            </View>
          )}

          {/* Content */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </RNModal>
  );
}
