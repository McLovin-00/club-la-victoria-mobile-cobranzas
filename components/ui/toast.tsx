import * as React from "react";
import { View, Text, Animated, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { CheckCircle, XCircle, Info } from "lucide-react-native";

// Toast Context
interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, variant?: Toast["variant"]) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

const toastVariants = cva(
  "flex-row items-center gap-3 px-4 py-3 rounded-xl shadow-elevated",
  {
    variants: {
      variant: {
        success: "bg-green-500",
        error: "bg-destructive",
        info: "bg-primary",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) => {
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const Icon = icons[toast.variant];

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
      }}
      className="absolute top-12 left-4 right-4 z-50"
    >
      <View className={cn(toastVariants({ variant: toast.variant }))}>
        <Icon size={20} color="white" />
        <Text className="flex-1 text-white font-medium text-base">
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const showToast = React.useCallback((message: string, variant: Toast["variant"] = "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
