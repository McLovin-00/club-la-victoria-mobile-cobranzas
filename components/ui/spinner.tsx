import * as React from "react";
import { View, Animated, AccessibilityInfo, type ViewStyle } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
const spinnerVariants = cva("items-center justify-center", {
  variants: {
    size: {
      sm: "w-4 h-4",
      default: "w-5 h-5",
      lg: "w-6 h-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  color?: string;
  /** Accessibility label for screen readers. Defaults to "Cargando". */
  accessibilityLabel?: string;
}

const Spinner = React.forwardRef<View, SpinnerProps>(
  ({ className, size, color, accessibilityLabel }, ref) => {
    const rotation = React.useRef(new Animated.Value(0)).current;
    const [reduceMotion, setReduceMotion] = React.useState(false);

    React.useEffect(() => {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReduceMotion
      );
      return () => subscription.remove();
    }, []);

    React.useEffect(() => {
      if (reduceMotion) return;
      const animation = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }, [rotation, reduceMotion]);

    const spin = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });
    return (
      <Animated.View
        ref={ref as any}
        className={cn(spinnerVariants({ size, className }))}
        style={reduceMotion ? undefined : { transform: [{ rotate: spin }] } as any}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel ?? "Cargando"}
        accessibilityLiveRegion="polite"
        accessibilityState={{ busy: true }}
      >
        <View
          className={cn(
            "w-full h-full rounded-full border-2 border-transparent",
            !color && "border-t-primary border-r-primary"
          )}
          style={color ? { borderTopColor: color, borderRightColor: color } : undefined}
        />
      </Animated.View>
    );
  }
);
Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
