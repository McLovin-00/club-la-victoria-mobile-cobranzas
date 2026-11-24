import * as React from "react";
import { View, Text, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "flex-row items-center justify-center rounded-full gap-1.5",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-emerald-50 border border-emerald-200",
        warning: "bg-amber-50 border border-amber-200",
        destructive: "bg-destructive",
        outline: "border border-border bg-transparent",
        secondary: "bg-secondary",
      },
      size: {
        sm: "px-2.5 py-1",
        default: "px-3 py-1",
        lg: "px-3.5 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const badgeTextVariants = cva("font-semibold leading-none", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      success: "text-emerald-900",
      warning: "text-amber-950",
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

const badgeDotColor: Partial<Record<NonNullable<VariantProps<typeof badgeVariants>["variant"]>, string>> = {
  success: "bg-emerald-600",
  warning: "bg-amber-600",
};

export interface BadgeProps
  extends ViewProps,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  /** Accessibility label for screen readers. Defaults to children text if string. */
  accessibilityLabel?: string;
}

const Badge = React.forwardRef<React.ElementRef<typeof View>, BadgeProps>(
  ({ className, variant, size, children, accessibilityLabel, ...props }, ref) => {
    const dotClass = variant ? badgeDotColor[variant] : undefined;
    return (
      <View
        ref={ref}
        accessible
        className={cn(badgeVariants({ variant, size, className }))}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
        {...props}
      >
        {dotClass && (
          <View
            className={cn("w-1.5 h-1.5 rounded-full", dotClass)}
            accessibilityElementsHidden
            aria-hidden
          />
        )}
        <Text className={cn(badgeTextVariants({ variant, size }))}>
          {children}
        </Text>
      </View>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants, badgeTextVariants };
