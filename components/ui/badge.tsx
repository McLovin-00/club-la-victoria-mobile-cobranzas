import * as React from "react";
import { View, Text, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "flex-row items-center justify-center rounded-full",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-green-500",
        warning: "bg-amber-500",
        destructive: "bg-destructive",
        outline: "border border-border bg-transparent",
        secondary: "bg-secondary",
      },
      size: {
        sm: "px-2 py-0.5",
        default: "px-2.5 py-1",
        lg: "px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const badgeTextVariants = cva("font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      success: "text-white",
      warning: "text-white",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
    },
    size: {
      sm: "text-xs",
      default: "text-xs",
      lg: "text-sm",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface BadgeProps
  extends ViewProps,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  /** Accessibility label for screen readers. Defaults to children text if string. */
  accessibilityLabel?: string;
}

const Badge = React.forwardRef<React.ElementRef<typeof View>, BadgeProps>(
  ({ className, variant, size, children, accessibilityLabel, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
    >
      <Text className={cn(badgeTextVariants({ variant, size }))}>
        {children}
      </Text>
    </View>
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants, badgeTextVariants };
