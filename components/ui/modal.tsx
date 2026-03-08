import { ReactNode, useEffect } from "react";
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

  // Animation value for fade
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
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
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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
            maxHeight: SCREEN_HEIGHT * 0.75,
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
            className="flex-1 px-6 py-4"
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
