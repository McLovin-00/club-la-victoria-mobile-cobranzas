import * as React from "react";
import { Pressable, Text, View, AccessibilityInfo, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";
const buttonVariants = cva(
  "flex-row items-center justify-center rounded-xl gap-2 transition-transform duration-200",
  {
    variants: {
      variant: {
        default: "bg-primary shadow-card active:opacity-90",
        destructive: "bg-destructive shadow-card active:opacity-90",
        outline: "border border-input bg-background active:bg-muted",
        secondary: "bg-secondary active:opacity-80",
        ghost: "active:bg-muted",
        link: "",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 py-2",
        lg: "h-12 px-6 py-3",
        icon: "h-11 w-11",
      },
      reduceMotion: {
        true: "",
        false: "active:scale-[0.97]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      reduceMotion: false,
    },
  }
);

const buttonTextVariants = cva("font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary",
    },
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-lg",
      icon: "text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  textClass?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  /** Accessibility label for screen readers. Defaults to children text if string. */
  accessibilityLabel?: string;
  /** Hint text read after label to describe the result of the action. */
  accessibilityHint?: string;
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      children,
      textClass,
      leftIcon,
      rightIcon,
      loading,
      disabled,
      accessibilityLabel,
      accessibilityHint,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const [reduceMotion, setReduceMotion] = React.useState(false);

    React.useEffect(() => {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReduceMotion
      );
      return () => subscription.remove();
    }, []);

    // Auto-generate accessibility label from children if string
    const computedLabel = accessibilityLabel ??
      (typeof children === 'string' ? children : undefined);

    return (
      <Pressable
        className={cn(
          buttonVariants({ variant, size, reduceMotion, className })
        )}
        style={{ opacity: isDisabled ? 0.5 : 1 }}
        ref={ref}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={computedLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...props}
      >
        {loading ? (
          <Spinner size="sm" color={variant === "default" || variant === "destructive" ? "#ffffff" : "hsl(180, 70%, 40%)"} />
        ) : (
          <>
            {leftIcon && <View className="mr-1" accessibilityElementsHidden>{leftIcon}</View>}
            <Text
              className={cn(buttonTextVariants({ variant, size, className: textClass }))}
            >
              {children}
            </Text>
            {rightIcon && <View className="ml-1" accessibilityElementsHidden>{rightIcon}</View>}
          </>
        )}
      </Pressable>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants, buttonTextVariants };
