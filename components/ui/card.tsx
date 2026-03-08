import * as React from "react";
import { View, Text, type ViewProps, type TextProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva("rounded-2xl border", {
  variants: {
    variant: {
      default: "bg-card border-border shadow-card",
      elevated: "bg-card border-transparent shadow-elevated",
      outline: "bg-transparent border-border border-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps extends ViewProps, VariantProps<typeof cardVariants> {
  /** Accessibility label for the card content. */
  accessibilityLabel?: string;
  /** Set to true if this card is interactive (clickable). */
  interactive?: boolean;
}

const Card = React.forwardRef<React.ElementRef<typeof View>, CardProps>(
  ({ className, variant, interactive, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      accessibilityRole={interactive ? "button" : undefined}
      {...props}
    >
      {children}
    </View>
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn("flex flex-col gap-2 p-6 pb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn(
        "text-xl font-semibold leading-none tracking-tight text-card-foreground",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn("flex flex-row items-center p-6 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
